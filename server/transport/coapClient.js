// server/transport/coapClient.js
const crypto = require('crypto');
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
      port: client.port || 5683,
      method,
      pathname: path,
      token : token,
      confirmable: options.confirmable !== false,
      observe: options?.observe !== undefined ? options.observe : undefined,
      query: query !== undefined ? query : undefined,
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

    req.on('error', (err) => {
      clearTimeout(timeout);
      sharedEmitter.emit('error', err);
      reject(err);
    });

    req.end();
  });
}

module.exports = {
  sendCoapRequest,
};