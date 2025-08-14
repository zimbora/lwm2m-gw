// server/transport/coapClientDTLS.js
const coapPacket = require('coap-packet');
const { getDTLSSocketManager } = require('./dtlsSocketManager');
const sharedEmitter = require('./sharedEmitter');

/**
 * Sends a CoAP request over DTLS using persistent socket connections.
 * @param {Object} client - Client info object. Must include at least address and port.
 * @param {string} method - CoAP method (GET, PUT, POST, DELETE).
 * @param {string} path - Resource path
 * @param {string|Buffer|null} [payload=null] - Pre-formatted payload to send.
 * @param {string} [query=''] - Query string for URI query parameters.
 * @param {Object} [options={}] - Additional options: format (content-format), observe, confirmable, timeout.
 * @returns {Promise<Object>} Resolves with response { code, payload, token }.
 */
function sendDTLSCoapRequest(client, method, path, payload = null, query = '', options = {}) {
  return new Promise(async (resolve, reject) => {
    if (!client || !client.address) {
      return reject(new Error('Invalid client: address is required'));
    }

    if (!client.ep) {
      return reject(new Error('Invalid client: ep (endpoint name) is required'));
    }

    try {
      // Get persistent socket from socket manager
      const socketManager = getDTLSSocketManager();
      const socket = await socketManager.getSocket(client.ep, client);

      // Map method to CoAP code
      const methodMap = { GET: '0.01', POST: '0.02', PUT: '0.03', DELETE: '0.04' };
      const code = methodMap[method.toUpperCase()] || '0.01';

      // Build CoAP options
      const coapOptions = [
        { name: 'Uri-Path', value: Buffer.from(path) }
      ];
      if (query) {
        coapOptions.push({ name: 'Uri-Query', value: Buffer.from(query) });
      }
      if (options.format) {
        coapOptions.push({ name: 'Content-Format', value: Buffer.from(options.format.toString()) });
      }

      if (options.observe !== undefined) {
        coapOptions.push({ name: 'Observe', value: Buffer.from([options.observe]) });
      }

      const coapReq = coapPacket.generate({
        confirmable: options?.confirmable !== false,
        messageId: Math.floor(Math.random() * 65535),
        code,
        options: coapOptions,
        payload: payload ? Buffer.from(payload) : Buffer.alloc(0)
      });

      let timeout = setTimeout(() => {
        sharedEmitter.emit('error', new Error('CoAP DTLS request timed out'));
        reject(new Error('CoAP DTLS request timed out'));
      }, options.timeout || 5000);

      // Set up one-time message handler for this request
      const messageHandler = (msg) => {
        clearTimeout(timeout);
        try {
          const parsed = coapPacket.parse(msg);
          resolve({ code: parsed.code, token: parsed?.token.toString('hex'), payload: parsed.payload.toString() });
        } catch (err) {
          reject(new Error(`Failed to parse CoAP response: ${err.message}`));
        }
      };

      // Add temporary listener for this request
      socket.once('message', messageHandler);

      // Send the request
      try {
        socket.send(coapReq);
      } catch (err) {
        clearTimeout(timeout);
        socket.removeListener('message', messageHandler);
        reject(err);
      }

    } catch (err) {
      reject(new Error(`Failed to get DTLS socket: ${err.message}`));
    }
  });
}

module.exports = {
  sendDTLSCoapRequest,
};