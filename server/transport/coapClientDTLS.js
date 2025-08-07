// server/transport/coapClient.js
const coap = require('coap');
const sharedEmitter = require('./sharedEmitter');

/**
 * Sends a CoAP request.
 * @param {Object} client - Client info object. Must include at least host and port.
 * @param {string} method - CoAP method (GET, PUT, POST, DELETE).
 * @param {string|Buffer|null} [payload=null] - Pre-formatted payload to send.
 * @param {string} [query=''] - Query string for URI query parameters.
 * @param {Object} [options={}] - Additional options: format (content-format), observe, confirmable, timeout.
 * @returns {Promise<Object>} Resolves with response { code, payload, emitter }.
 */
function sendDTLSCoapRequest(client, method, path, payload = null, query = '', options = {}) {
  return new Promise((resolve, reject) => {
    if (!client || !client.address) {
      return reject(new Error('Invalid client: address is required'));
    }

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
      confirmable: options.confirmable !== false,
      messageId: Math.floor(Math.random() * 65535),
      code,
      options: coapOptions,
      payload: payload ? Buffer.from(payload) : Buffer.alloc(0)
    });

    const socket = dtls.createSocket({
      type: "udp4",
      address: client.address,
      port: client.port,
      psk: { "Client_identity": "secret" } // should be replaced with actual PSK, use client
    });

    let timeout = setTimeout(() => {
      sharedEmitter.emit('error', new Error('CoAP DTLS request timed out'));
      socket.close();
      reject(new Error('CoAP DTLS request timed out'));
    }, options.timeout || 5000);

    socket.on("connected", () => {
      socket.send(coapReq);
    });

    socket.on("message", (msg) => {
      clearTimeout(timeout);
      try {
        const parsed = coapPacket.parse(msg);
        resolve({ code: parsed.code, payload: parsed.payload.toString() });
      } catch (err) {
        reject(new Error(`Failed to parse CoAP response: ${err.message}`));
      }
      socket.close();
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      sharedEmitter.emit('error', err);
      reject(err);
      socket.close();
    });

    socket.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

module.exports = {
  sendDTLSCoapRequest,
};