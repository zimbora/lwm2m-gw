// server/ObservationRegistry.js

const registry = new Map(); // token -> { ep, path, format }

/**
 * Registers a token observation and associates it with a client (ep), path, and format.
 * @param {Buffer|string} token - Unique token for the observation.
 * @param {string} ep - Endpoint of the client.
 * @param {string} path - Path of the resource being observed.
 * @param {string} format - Format of the observation (e.g., text, json, cbor, tlv).
 */
function registerObservation(token, ep, path, format) {
  if (!token || !ep || !path || !format) {
    throw new Error('Token, endpoint (ep), path, and format are required to register an observation.');
  }

  const tokenKey = token.toString('hex'); // Convert token to a hex string for consistent storage
  registry.set(tokenKey, { ep, path, format });
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
 * Deregisters an observation associated with a given token.
 * @param {Buffer|string} token - Unique token for the observation.
 * @returns {boolean} True if the observation was removed, false if not found.
 */
function deregisterObservation(token) {
  if (!token) {
    throw new Error('Token is required to deregister an observation.');
  }

  const tokenKey = token.toString('hex'); // Convert token to a hex string
  return registry.delete(tokenKey);
}

module.exports = {
  registerObservation,
  getObservation,
  deregisterObservation,
};
