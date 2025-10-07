// server/transport/coapClient.js
const crypto = require('crypto');
const coap = require('coap'); //https://github.com/coapjs/node-coap#readme
const sharedEmitter = require('./sharedEmitter');

// Create a custom agent (UDP socket manager)
const agent = new coap.Agent({ type: 'udp4' }); // Use 'udp6' for IPv6 if needed

/**
 * Sends a CoAP request.
 * @param {Object} client - Client info object. Must include at least host and port.
 * @param {string} method - CoAP method (GET, PUT, POST, DELETE).
 * @param {string|Buffer|null} [payload=null] - Pre-formatted payload to send.
 * @param {string} [query=''] - Query string for URI query parameters.
 * @param {Object} [options={}] - Additional options: format (content-format), observe, confirmable, timeout.
 * @returns {Promise<Object>} Resolves with response { code, payload, emitter }.
 */
function sendCoapRequest(client, method, path, payload = null, query = '', options = {}) {
  return new Promise((resolve, reject) => {
    // Validate client input
    if (!client || !client.address) {
      return reject(new Error('Invalid client: address is required'));
    }

    let token = null;
    if(options?.observe !== undefined)
      token = crypto.randomBytes(8);

    const reqOpts = {
      hostname: client.address,
      port: client.port || 5683, // Keep backward compatibility, use default port if none provided
      method,
      pathname: path,
      token : token,
      confirmable: options.confirmable !== false,
      observe: options?.observe !== undefined ? options.observe : undefined,
      query: query !== undefined ? query : undefined,
      agent: agent 
    };
    
    const req = coap.request(reqOpts);
    
    // Set Content-Format if specified
    if (options.format) {
      req.setOption('Content-Format', options.format);
    }

    // Write payload if provided
    if (payload) {
      try{
        req.write(payload);
      }catch(err){
        reject(err);
      }
    }

    const timeout = setTimeout(() => {
      const error = `CoAP request ${method}/${path} timed out for client: ${client.ep}`
      sharedEmitter.emit('error', new Error(error));
      reject(new Error(error));
    }, options.timeout || 5000); // Default timeout: 5 seconds

    req.on('response', (res) => {
      clearTimeout(timeout);

      let responsePayload = res.payload;
      try {
        let token = undefined;
        if(reqOpts?.observe == 0){
          try{
            token = Buffer.from(res?._packet?.token).toString('hex');
            console.log("token received on observation request:",token)
          }catch(error){
            reject(new Error(`Failed to get CoAP token: ${error.message}`));
          }
        }
        responsePayload = res.payload.toString(); // Default to string
        resolve({ code: res.code, token , payload: responsePayload });
      } catch (err) {
        reject(new Error(`Failed to process CoAP response: ${err.message}`));
      }
    });

    req.on('close', (err) => {
      console.log("socket closed");
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      console.error("CoAP request error:", err); // Log it!
      sharedEmitter.emit('error', err);
      reject(err);
    });

    req.end();
  });
}

/**
 * Sends a CoAP request using an existing socket.
 * @param {Object} socket - The socket to use for communication.
 * @param {string} method - CoAP method (GET, PUT, POST, DELETE).
 * @param {string} path - The path to request.
 * @param {string|Buffer|null} [payload=null] - Payload to send.
 * @param {string} [query=''] - Query string for URI query parameters.
 * @param {Object} [options={}] - Additional options: format (content-format), observe, confirmable, timeout.
 * @returns {Promise<Object>} Resolves with response { code, payload, token }.
 */
function sendCoapRequestViaSocket(socket, method, path, payload = null, query = '', options = {}) {
  return new Promise((resolve, reject) => {
    if (!socket || socket.destroyed) {
      return reject(new Error('Invalid or destroyed socket'));
    }

    const coapPacket = require('coap-packet');
    const crypto = require('crypto');

    let token = null;
    if (options?.observe !== undefined) {
      token = crypto.randomBytes(8);
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

    // Generate CoAP packet
    const coapReq = coapPacket.generate({
      confirmable: options?.confirmable !== false,
      messageId: Math.floor(Math.random() * 65535),
      token: token || Buffer.alloc(0),
      code,
      options: coapOptions,
      payload: payload ? Buffer.from(payload) : Buffer.alloc(0)
    });

    const timeout = setTimeout(() => {
      const error = `CoAP socket request ${method}/${path} timed out`
      reject(new Error(error));
    }, options.timeout || 5000); // Default timeout: 5 seconds

    // Set up a one-time listener for response
    const responseHandler = (data) => {
      clearTimeout(timeout);
      try {
        const parsed = coapPacket.parse(data);
        let responsePayload = parsed.payload ? parsed.payload.toString() : '';
        let responseToken = parsed?.token ? parsed.token.toString('hex') : undefined;
        
        resolve({ 
          code: parsed.code, 
          token: responseToken, 
          payload: responsePayload,
          socket: socket 
        });
      } catch (err) {
        reject(new Error(`Failed to parse CoAP response: ${err.message}`));
      }
    };

    socket.once('data', responseHandler);

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.removeListener('data', responseHandler);
      reject(err);
    });

    // Send the CoAP request
    try {
      socket.write(coapReq);
    } catch (err) {
      clearTimeout(timeout);
      socket.removeListener('data', responseHandler);
      reject(err);
    }
  });
}

module.exports = {
  sendCoapRequest,
  sendCoapRequestViaSocket,
};