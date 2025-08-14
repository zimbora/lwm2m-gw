// server/transport/dtlsSocketManager.js
const { dtls } = require('node-dtls-client');
const sharedEmitter = require('./sharedEmitter');

class DTLSSocketManager {
  constructor(options = {}) {
    this.sockets = new Map(); // key: clientEp, value: { socket, lastUsed, connecting }
    this.defaultTimeout = options.timeout || 300000; // 5 minutes default timeout
    this.cleanupInterval = options.cleanupInterval || 60000; // Check every minute
    
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleSockets();
    }, this.cleanupInterval);
  }

  /**
   * Get or create a DTLS socket for a client
   * @param {string} ep - Client endpoint
   * @param {Object} client - Client info with address, port, etc.
   * @returns {Promise<Object>} Promise resolving to socket object
   */
  async getSocket(ep, client) {
    const existingSocket = this.sockets.get(ep);
    
    // If socket exists and is connected, return it
    if (existingSocket && existingSocket.socket && !existingSocket.connecting) {
      existingSocket.lastUsed = Date.now();
      return existingSocket.socket;
    }

    // If socket is currently connecting, wait for it
    if (existingSocket && existingSocket.connecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          const current = this.sockets.get(ep);
          if (current && current.socket && !current.connecting) {
            current.lastUsed = Date.now();
            resolve(current.socket);
          } else if (!current || !current.connecting) {
            reject(new Error('Connection failed or was cancelled'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    // Create new socket
    return this.createSocket(ep, client);
  }

  /**
   * Create a new DTLS socket for a client
   * @param {string} ep - Client endpoint
   * @param {Object} client - Client info
   * @returns {Promise<Object>} Promise resolving to socket object
   */
  createSocket(ep, client) {
    return new Promise((resolve, reject) => {
      try {
        // Mark as connecting
        this.sockets.set(ep, { socket: null, connecting: true, lastUsed: Date.now() });

        const socket = dtls.createSocket({
          type: "udp4",
          address: client.address,
          port: Number(client.port),
          psk: { "Client_identity": "secret" } // TODO: Use client-specific PSK
        });

        if (!socket) {
          this.sockets.delete(ep);
          return reject(new Error(`Failed to create DTLS socket for client: ${ep}`));
        }

        const timeout = setTimeout(() => {
          this.sockets.delete(ep);
          try {
            socket.close();
          } catch (err) {
            // Ignore cleanup errors
          }
          reject(new Error(`DTLS connection timeout for client: ${ep}`));
        }, 10000); // 10 second connection timeout

        socket.on("connected", () => {
          clearTimeout(timeout);
          
          // Update socket info
          this.sockets.set(ep, {
            socket,
            connecting: false,
            lastUsed: Date.now(),
            client
          });

          console.log(`[DTLS Socket Manager] Connected to client: ${ep}`);
          resolve(socket);
        });

        socket.on("error", (err) => {
          clearTimeout(timeout);
          console.error(`[DTLS Socket Manager] Socket error for client ${ep}: ${err.message}`);
          
          this.sockets.delete(ep);
          try {
            socket.close();
          } catch (closeErr) {
            // Ignore cleanup errors
          }
          
          sharedEmitter.emit('error', `DTLS socket error for client: ${ep} - ${err.message}`);
          reject(err);
        });

        socket.on("close", () => {
          console.log(`[DTLS Socket Manager] Socket closed for client: ${ep}`);
          this.sockets.delete(ep);
        });

      } catch (err) {
        this.sockets.delete(ep);
        reject(err);
      }
    });
  }

  /**
   * Close socket for a specific client
   * @param {string} ep - Client endpoint
   */
  closeSocket(ep) {
    const socketInfo = this.sockets.get(ep);
    if (socketInfo && socketInfo.socket) {
      try {
        socketInfo.socket.close();
        console.log(`[DTLS Socket Manager] Closed socket for client: ${ep}`);
      } catch (err) {
        console.error(`[DTLS Socket Manager] Error closing socket for client ${ep}: ${err.message}`);
      }
    }
    this.sockets.delete(ep);
  }

  /**
   * Clean up idle sockets that haven't been used recently
   */
  cleanupIdleSockets() {
    const now = Date.now();
    const toDelete = [];

    for (const [ep, socketInfo] of this.sockets.entries()) {
      if (socketInfo.lastUsed && (now - socketInfo.lastUsed) > this.defaultTimeout) {
        toDelete.push(ep);
      }
    }

    for (const ep of toDelete) {
      console.log(`[DTLS Socket Manager] Cleaning up idle socket for client: ${ep}`);
      this.closeSocket(ep);
    }
  }

  /**
   * Close all sockets and cleanup
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    for (const [ep] of this.sockets.entries()) {
      this.closeSocket(ep);
    }

    console.log(`[DTLS Socket Manager] Destroyed socket manager`);
  }

  /**
   * Get stats about current sockets
   */
  getStats() {
    return {
      totalSockets: this.sockets.size,
      sockets: Array.from(this.sockets.entries()).map(([ep, info]) => ({
        ep,
        connected: info.socket && !info.connecting,
        connecting: info.connecting,
        lastUsed: info.lastUsed,
        idleTime: Date.now() - (info.lastUsed || 0)
      }))
    };
  }
}

// Singleton instance
let socketManager = null;

function getDTLSSocketManager(options = {}) {
  if (!socketManager) {
    socketManager = new DTLSSocketManager(options);
  }
  return socketManager;
}

function destroyDTLSSocketManager() {
  if (socketManager) {
    socketManager.destroy();
    socketManager = null;
  }
}

module.exports = {
  DTLSSocketManager,
  getDTLSSocketManager,
  destroyDTLSSocketManager
};