const { getDTLSSocketManager } = require('./transport/dtlsSocketManager');

const clients = new Map(); // key: ep, value: { address, port, location }

function registerClient(ep, info) {
  clients.set(ep, info);
  
  // For DTLS clients, initialize socket connection
  if (info.protocol === 'coaps') {
    const socketManager = getDTLSSocketManager();
    // Pre-create the socket for DTLS clients to avoid authentication delay
    socketManager.getSocket(ep, info).catch(err => {
      console.error(`[Client Registry] Failed to create initial DTLS socket for ${ep}: ${err.message}`);
    });
  }
}

function getClient(ep) {
  const client = clients.get(ep);
  if (client) {
    // Add the endpoint name to the client info for socket management
    return { ...client, ep };
  }
  return null;
}

function updateClient(locationPath, info) {
  for (const [ep, clientInfo] of clients.entries()) {
    if (clientInfo.location === locationPath) {
      clients.set(ep, { ...clients.get(ep), ...info });
      return ep;
    }
  }
  return null;
}

function deregisterClientByLocation(locationPath) {
  for (const [ep, info] of clients.entries()) {
    if (info.location === locationPath) {
      // Close DTLS socket if it exists
      if (info.protocol === 'coaps') {
        const socketManager = getDTLSSocketManager();
        socketManager.closeSocket(ep);
      }
      
      clients.delete(ep);
      return ep;
    }
  }
  return null;
}

function deregisterClient(ep) {
  const info = clients.get(ep);
  if (info) {
    // Close DTLS socket if it exists
    if (info.protocol === 'coaps') {
      const socketManager = getDTLSSocketManager();
      socketManager.closeSocket(ep);
    }
    
    clients.delete(ep);
    return ep;
  }
  return null;
}

function listClients() {
  const result = [];
  for (const [ep, info] of clients.entries()) {
    result.push({ ep, ...info });
  }
  return result;
}

module.exports = {
  registerClient,
  updateClient,
  getClient,
  deregisterClientByLocation,
  deregisterClient,
  listClients,
};
