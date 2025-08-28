const clients = new Map(); // key: ep, value: { address, port, location }

function registerClient(ep, info) {
  const now = Date.now();
  const clientInfo = {
    ...info,
    lastActivity: now,
    registeredAt: now,
    offline: false
  };
  clients.set(ep, clientInfo);
}

function getClient(ep) {
  return clients.get(ep);
}

function updateClient(locationPath, info) {
  for (const [ep, clientInfo] of clients.entries()) {
    if (clientInfo.location === locationPath) {
      const updatedInfo = { 
        ...clients.get(ep), 
        ...info, 
        lastActivity: Date.now(),
        offline: false // Client is active again
      };
      clients.set(ep, updatedInfo);
      return ep;
    }
  }
  return null;
}

function deregisterClientByLocation(locationPath) {
  for (const [ep, info] of clients.entries()) {
    if (info.location === locationPath) {
      clients.delete(ep);
      return ep;
    }
  }
  return null;
}

function associateSocketToClient(ep, socket){
  let client = getClient(ep);
  clients.set(ep,{ ...client, socket });
}

function listClients() {
  const result = [];
  for (const [ep, info] of clients.entries()) {
    result.push({ ep, ...info });
  }
  return result;
}

function updateClientActivity(ep) {
  const client = clients.get(ep);
  if (client) {
    clients.set(ep, { 
      ...client, 
      lastActivity: Date.now(),
      offline: false 
    });
    return true;
  }
  return false;
}

function setClientOffline(ep) {
  const client = clients.get(ep);
  if (client) {
    clients.set(ep, { ...client, offline: true });
    return true;
  }
  return false;
}

function deregisterClient(ep) {
  return clients.delete(ep);
}

module.exports = {
  registerClient,
  updateClient,
  getClient,
  deregisterClientByLocation,
  associateSocketToClient,
  listClients,
  updateClientActivity,
  setClientOffline,
  deregisterClient,
};
