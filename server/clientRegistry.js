const clients = new Map(); // key: ep, value: { address, port, location }

function registerClient(ep, info) {
  clients.set(ep, info);
}

function getClient(ep) {
  return clients.get(ep);
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
      clients.delete(ep);
      return ep;
    }
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
  listClients,
};
