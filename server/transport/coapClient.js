// server/transport/coapClient.js
const crypto = require('crypto');
//const coap = require('coap'); //https://github.com/coapjs/node-coap#readme
const coapPacket = require('coap-packet');
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
 /*
function sendCoapRequest(client, method, path, payload = null, query = '', options = {}) {
  return new Promise((resolve, reject) => {
    // Validate client input
    if (!client || !client.address || !client.port) {
      return reject(new Error('Invalid client: address and port are required'));
    }

    let token = null;
    if(options?.observe !== undefined)
      token = crypto.randomBytes(8);

    const reqOpts = {
      hostname: client.address,
      port: client.port,
      method,
      pathname: path,
      token : token,
      confirmable: options.confirmable !== false,
      observe: options?.observe !== undefined ? options.observe : undefined,
      query: query !== undefined ? query : undefined,
      agent: $.coapAgent
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
*/
function sendCoapRequest(client, method, path, payload = null, query = '', options = {}) {
  
  console.log(`send request ${method} ${path}`);
  return new Promise((resolve, reject) => {
    if (!client || !client.address) {
      return reject(new Error('Invalid client: address is required'));
    }

    let token = null

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
      token = crypto.randomBytes(8);
    }

    const coapReq = coapPacket.generate({
      confirmable: options?.confirmable !== false,
      messageId: client.msgId++,
      token: token ? Buffer.from(token,'hex') : Buffer.alloc(0),
      code,
      options: coapOptions,
      payload: payload ? Buffer.from(payload) : Buffer.alloc(0)
    });

    let socket = null;

    console.log(client);

    if($.coapSocket){
      try{
        console.log("Reusing socket opened by client");
        try{
          $.coapSocket.send(coapReq, client.port, client.address,(err)=>{
            if(err){
              console.log(`[COAP Server] coap error error requesting from: ${address}:${port}`);
              console.error(err);
            }  
          });
        }catch(err){
          console.log(`[COAP Server] coap error error requesting from: ${address}:${port}`);
          console.error(err);
        }

      }catch(error){
        console.log(error)
        reject(error)
      }
    }else{

      if(client?.socket && !client.socket.isClosed){
        socket = client.socket;
        
        try{
          socket.send(coapReq, client.address, client.port);

        }catch(error){
          console.log(error)
          reject(error)
        }
      }else{

        socket = dtls.createSocket({
          type: "udp4",
          address: client.address,
          port: Number(client.port),
          psk: { "Client_identity": "secret" } // should be replaced with actual PSK, use client
        });

        socket.on("connected", () => {
          clearTimeout(timeout);
          try{
            socket.send(coapReq);
          }catch(err){
            return reject(err);
          }
        });

      }

      // increase time for authentication
      let timeout = setTimeout(() => {
        const error = new Error('CoAP request timed out');
        sharedEmitter.emit('error', error);
        try {
          socket.close();
        } catch(err) {}
        reject(error);
      }, options.timeout || 5000);

      socket.on("message", (msg) => {
        clearTimeout(timeout);
        try {
          const parsed = coapPacket.parse(msg);
          if (options.observe == 0)
            console.log("token received on observation request:",parsed?.token.toString('hex'));
          resolve({ code: parsed.code, token:parsed?.token.toString('hex'), payload: parsed.payload.toString(), socket });
        } catch (err) {
          reject(new Error(`Failed to parse CoAP response: ${err.message}`));
        }
        /*
        try {
          socket.close();
        }catch(err){}
        */
      });

      socket.on("error", (err) => {
        clearTimeout(timeout);
        sharedEmitter.emit('error', `Error connecting to client: ${client.location}`);
        reject(new Error(`Error connecting to client: ${client.location}`));
        try {
          socket.close();
        }catch(err){}
      });

      socket.on("close", () => {
        console.log("socket closed");
        clearTimeout(timeout);
      });

    }


  });

}

module.exports = {
  sendCoapRequest,
};