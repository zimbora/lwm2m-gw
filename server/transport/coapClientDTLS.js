// server/transport/coapClientDTLS.js
const crypto = require('crypto');
const coapPacket = require('coap-packet');
const { dtls } = require('node-dtls-client');
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
function sendDTLSCoapRequest(
  client,
  method,
  path,
  payload = null,
  query = '',
  options = {}
) {
  console.log(`send request ${method} ${path}`);
  return new Promise((resolve, reject) => {
    if (!client || !client.address) {
      return reject(new Error('Invalid client: address is required'));
    }

    let token = null;

    // Map method to CoAP code
    const methodMap = {
      GET: '0.01',
      POST: '0.02',
      PUT: '0.03',
      DELETE: '0.04',
    };
    const code = methodMap[method.toUpperCase()] || '0.01';

    // Build CoAP options
    const coapOptions = [{ name: 'Uri-Path', value: Buffer.from(path) }];
    if (query) {
      coapOptions.push({ name: 'Uri-Query', value: Buffer.from(query) });
    }
    if (options.format) {
      coapOptions.push({
        name: 'Content-Format',
        value: Buffer.from(options.format.toString()),
      });
    }

    if (options.observe !== undefined) {
      coapOptions.push({
        name: 'Observe',
        value: Buffer.from([options.observe]),
      });
      token = crypto.randomBytes(8);
    }

    const coapReq = coapPacket.generate({
      confirmable: options?.confirmable !== false,
      messageId: Math.floor(Math.random() * 65535),
      token: token ? Buffer.from(token, 'hex') : Buffer.alloc(0),
      code,
      options: coapOptions,
      payload: payload ? Buffer.from(payload) : Buffer.alloc(0),
    });

    let socket = null;
    if (client?.socket && !client.socket.isClosed) {
      socket = client.socket;

      try {
        socket.send(coapReq);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    } else {
      socket = dtls.createSocket({
        type: 'udp4',
        address: client.address,
        port: Number(client.port),
        psk: { Client_identity: 'secret' }, // should be replaced with actual PSK, use client
      });

      socket.on('connected', () => {
        clearTimeout(timeout);
        try {
          socket.send(coapReq);
        } catch (err) {
          return reject(err);
        }
      });
    }

    // increase time for authentication
    const timeout = setTimeout(() => {
      const error = new Error('CoAP DTLS request timed out');
      sharedEmitter.emit('error', error);
      try {
        socket.close();
      } catch (err) {}
      reject(error);
    }, options.timeout || 5000);

    socket.on('message', (msg) => {
      clearTimeout(timeout);
      try {
        const parsed = coapPacket.parse(msg);
        if (options.observe == 0) {
          console.log(
            'token received on observation request:',
            parsed?.token.toString('hex')
          );
        }
        resolve({
          code: parsed.code,
          token: parsed?.token.toString('hex'),
          payload: parsed.payload.toString(),
          socket,
        });
      } catch (err) {
        reject(new Error(`Failed to parse CoAP response: ${err.message}`));
      }
      /*
      try {
        socket.close();
      }catch(err){}
      */
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      sharedEmitter.emit(
        'error',
        `Error connecting to client: ${client.location}`
      );
      reject(new Error(`Error connecting to client: ${client.location}`));
      try {
        socket.close();
      } catch (err) {}
    });

    socket.on('close', () => {
      console.log('socket closed');
      clearTimeout(timeout);
    });
  });
}

module.exports = {
  sendDTLSCoapRequest,
};
