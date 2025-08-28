// server/timeoutManager.js
const { listClients, setClientOffline, deregisterClient } = require('./clientRegistry');
const sharedEmitter = require('./transport/sharedEmitter');

const OFFLINE_TIMEOUT = 60 * 1000; // 60 seconds in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let timeoutInterval = null;

function startTimeoutManager() {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
  }

  console.log('[Timeout Manager] Starting client timeout monitoring');
  
  timeoutInterval = setInterval(() => {
    checkClientTimeouts();
  }, CHECK_INTERVAL);

  // Prevent the interval from keeping the process alive
  timeoutInterval.unref();

  return timeoutInterval;
}

function stopTimeoutManager() {
  if (timeoutInterval) {
    console.log('[Timeout Manager] Stopping client timeout monitoring');
    clearInterval(timeoutInterval);
    timeoutInterval = null;
  }
}

function checkClientTimeouts() {
  const now = Date.now();
  const clients = listClients();

  for (const client of clients) {
    const { ep, lastActivity, offline, lifetime, registeredAt } = client;
    const timeSinceLastActivity = now - lastActivity;
    const timeSinceRegistration = now - registeredAt;

    // Convert lifetime from seconds to milliseconds
    const lifetimeMs = lifetime * 1000;

    // Check if client should be deregistered (exceeded lifetime)
    if (timeSinceLastActivity > lifetimeMs) {
      console.log(`[Timeout Manager] Deregistering client ${ep} - exceeded lifetime (${lifetime}s)`);
      deregisterClient(ep);
      sharedEmitter.emit('deregistration', { 
        protocol: client.protocol, 
        ep, 
        reason: 'lifetime_expired' 
      });
      continue;
    }

    // Check if client should be marked as offline (60s without activity)
    if (!offline && timeSinceLastActivity > OFFLINE_TIMEOUT) {
      console.log(`[Timeout Manager] Marking client ${ep} as offline - no activity for ${timeSinceLastActivity}ms`);
      setClientOffline(ep);
      sharedEmitter.emit('client_offline', { 
        protocol: client.protocol, 
        ep,
        timeSinceLastActivity: timeSinceLastActivity 
      });
    }
  }
}

module.exports = {
  startTimeoutManager,
  stopTimeoutManager,
  checkClientTimeouts,
  OFFLINE_TIMEOUT,
  CHECK_INTERVAL
};