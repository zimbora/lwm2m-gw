// server/ObservationRegistry.js

const registry = new Map(); // token -> { ep, path, format, socket }

/**
 * Registers a token observation and associates it with a client (ep), path, and format.
 * @param {Buffer|string} token - Unique token for the observation.
 * @param {string} ep - Endpoint of the client.
 * @param {string} path - Path of the resource being observed.
 * @param {string} format - Format of the observation (e.g., text, json, cbor, tlv).
 * @param {Object} socket - Optional DTLS socket for cleanup.
 */
function registerObservation(token, ep, path, format, socket = null) {
  if (!token || !ep || !path || !format) {
    throw new Error(
      'Token, endpoint (ep), path, and format are required to register an observation.'
    );
  }

  const tokenKey = token.toString('hex'); // Convert token to a hex string for consistent storage
  registry.set(tokenKey, { ep, path, format, socket });
  return true;
}

/**
 * Retrieves observation details associated with a given token.
 * @param {Buffer|string} token - Unique token for the observation.
 * @returns {Object|null} Observation details { ep, path, format } or null if not found.
 */
function getObservation(token) {
  if (!token) {
    throw new Error('Token is required to retrieve an observation.');
  }

  const tokenKey = token.toString('hex'); // Convert token to a hex string
  return registry.get(tokenKey) || null;
}

/**
 * Deregisters an observation associated with a given token and closes its socket if present.
 * @param {Buffer|string} token - Unique token for the observation.
 * @returns {boolean} True if the observation was removed, false if not found.
 */
function deregisterObservation(token) {
  if (!token) {
    throw new Error('Token is required to deregister an observation.');
  }

  const tokenKey = token.toString('hex'); // Convert token to a hex string
  const observation = registry.get(tokenKey);

  if (observation && observation.socket) {
    // Close the associated socket to prevent socket leaks
    try {
      observation.socket.close();
    } catch (err) {
      // Ignore errors when closing socket
    }
  }
  return registry.delete(tokenKey);
}

function findTokenByEpAndPath(ep, path) {
  for (const [token, value] of registry.entries()) {
    if (value.ep === ep && value.path === path) {
      return token;
    }
  }
  return null; // not found
}

/**
 * Deregisters all observations and closes any associated sockets.
 * Useful for cleanup during shutdown.
 */
function cleanup(clientEp) {
  for (const [tokenKey, ep, observation] of registry) {
    if (clientEp == ep && epobservation.socket) {
      try {
        observation.socket.close();
      } catch (err) {
        // Ignore errors when closing socket
      }
    }
  }
  registry.clear();
}

module.exports = {
  registerObservation,
  getObservation,
  deregisterObservation,
  findTokenByEpAndPath,
  cleanup,
};
