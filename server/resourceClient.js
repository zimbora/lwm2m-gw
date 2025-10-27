// server/resourceClient.js
const coap = require('coap'); // https://github.com/coapjs/node-coap#readme
const coapPacket = require('coap-packet');
const dtls = require('node-mbedtls-server');
const dgram = require('dgram');

const sharedEmitter = require('./transport/sharedEmitter');
const { sendCoapRequest } = require('./transport/coapClient');
const { sendDTLSCoapRequest } = require('./transport/coapClientDTLS');
const { connectMqttClient, sendMqttRequest } = require('./transport/mqttClient');
const { handleRegister, handleUpdate, handleDeregister} = require('./handleRegistration');
const { registerObservation, getObservation, deregisterObservation, findTokenByEpAndPath } = require('./observationRegistry');
const PayloadCodec = require('../utils/payloadCodec');
const CONTENT_FORMATS = require('../utils/contentFormats');
const MessageStore = require('./transport/MessageStore');

$.msgStore = new MessageStore();

const { 
  getClient,
  associateSocketToClient,
  updateClientActivity,
} = require('./clientRegistry');

const { startTimeoutManager, stopTimeoutManager } = require('./timeoutManager');

const coapEnabled = true;
const mqttEnabled = false;

$.coapSocket = dgram.createSocket('udp4');

// === method to initialize client based on protocol ===
function startLwM2MCoapServer(validation, port, options = {}) {
  port = options?.port || 5683; // Standard CoAP port
  $.coapSocket.bind(port, () => {
    console.log('[COAP Server] Socket bound!');

    const protocol = 'coap';

    $.coapSocket.on('error', (err) => {
      console.error(`[COAP Server] error:\n${err.stack}`);
      $.coapSocket.close();
    });

    $.coapSocket.on('message', (msg, rinfo) => {
      console.log(`[COAP Server] ${msg} from ${rinfo.address}:${rinfo.port}`);
      parseReceivedData($.coapSocket,protocol,msg,validation, rinfo.address, rinfo.port);
    });

    $.coapSocket.on('listening', () => {
      const address = $.coapSocket.address();
      console.log(`[CoAP Server] LwM2M Server started on port: ${address.port}`);
      startTimeoutManager(options?.client?.offlineTimeout, options?.client?.checkInterval); // Start monitoring client timeouts
    });

    return $.coapSocket;

  });
}

// === method to initialize DTLS-enabled client ===
function startLwM2MDTLSCoapServer(validation, options = {}) {
  const port = options.port || 5684; // Standard CoAPS (DTLS) port
  
  try {

    const dtlsServer = dtls.createServer(options);
    //$.coapDtlsServerSocket = dtlsServer._sock; // store reference for server sock

    dtlsServer.on('secureConnection', (socket) => {
      console.log(`[DTLS] New secure connection from ${socket.remoteAddress}:${socket.remotePort}`);
      
      const protocol = 'coaps';  

      socket.on('data', (buffer) => {
        try {
          // Parse the CoAP message from the decrypted DTLS payload
          parseReceivedData(socket,protocol,buffer,validation);
          
        } catch (err) {
          console.error(`[DTLS Server] Error processing CoAP message:`, err);
        }
      });
      
      socket.on('error', (err) => {
        console.error(`[DTLS] Socket error: ${err.message}`);
      });
      
      socket.on('close', () => {
        console.log(`[DTLS] Connection closed`);
      });
    });
    
    dtlsServer.listen(port, () => {
      console.log(`[DTLS] LwM2M Server listening on port ${port}`);
      startTimeoutManager(options?.client?.offlineTimeout, options?.client?.checkInterval); // Start monitoring client timeouts
    });
    
    dtlsServer.on('error', (err) => {
      console.error(`[DTLS Server] Error: ${err.message}`);
    });
    
    return dtlsServer;
    
  } catch (err) {
    console.error(`[DTLS Server] Failed to create server: ${err.message}`);
    console.error(`[DTLS Server] Make sure you have valid RSA private key and X.509 certificate files.`);
    console.error(`[DTLS Server] Generate them with: openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes`);
    throw err;
  }
}

function startLwM2MMqttServer(brokerUrl, mqttOptions = {}) {
  
  return connectMqttClient(brokerUrl, mqttOptions).then((mqttClient) => {
    console.log(`[MQTT] LwM2M Server connected to broker at ${brokerUrl}`);

    mqttClient.on('message', async (topic, message) => {
      const path = topic.split('/').slice(2).join('/'); // Extract path from topic
      const method = topic.split('/')[1]; // Extract method from topic (e.g., POST, PUT, DELETE)

      try {
        if (method === 'POST' && path === 'rd') {
          // Handle registration
          const { ep, location } = await handleRegister({ payload: message }, { mqttClient }, 'mqtt');
          console.log(`[MQTT Server] Registered client: ${ep} at ${location}`);
          sharedEmitter.emit('registration', { protocol: 'mqtt', ep, location });

        } else if (method === 'PUT' && path.startsWith('rd/')) {
          // Handle update
          const { ep, location } = await handleUpdate({ payload: message, path }, { mqttClient });
          console.log(`[MQTT Server] Updated client: ${ep} at ${location}`);
          sharedEmitter.emit('update', { protocol: 'mqtt', ep, location });

        } else if (method === 'DELETE' && path.startsWith('rd/')) {
          // Handle deregistration
          const { ep } = await handleDeregister({ payload: message, path }, { mqttClient });
          console.log(`[MQTT Server] Deregistered client: ${ep}`);
          sharedEmitter.emit('deregistration', { protocol: 'mqtt', ep });

        } else {
          console.warn(`[MQTT Server] Unsupported method or path: ${method} ${path}`);
        }
      } catch (err) {
        console.error(`[MQTT Server] Error handling ${method} ${path}: ${err.message}`);
      }
    });

    // Subscribe to LwM2M topics
    const lwm2mTopic = '+/+/rd/#'; // Matches LwM2M operations
    mqttClient.subscribe(lwm2mTopic, (err) => {
      if (err) {
        console.error(`[MQTT Server] Failed to subscribe to topic: ${lwm2mTopic}`);
        throw err;
      }
      console.log(`[MQTT Server] Subscribed to topic: ${lwm2mTopic}`);
      startTimeoutManager(); // Start monitoring client timeouts
    });

    return mqttClient;
  }).catch((err) => {
    console.error(`[MQTT Server] Failed to connect to broker: ${err.message}`);
    throw err;
  });
}

// === Transport-Agnostic Request Dispatcher ===
function dispatchRequest(ep, method, path, payload = null, options = {}) {
  const client = getClient(ep);
  
  if (!client) {
    return Promise.reject(`Client for ep ${ep} not found`);
  }

  // Ensure content format is set
  if (!options.format) {
    options.format = CONTENT_FORMATS.text; // Default to plain text
  }

  // Encode payload based on the format
  if (payload !== null) {
    try {
      payload = PayloadCodec.encode(payload,options.format)
    } catch (err) {
      return Promise.reject(`Failed to encode payload: ${err.message}`);
    }
  }

  // Dispatch request based on protocol
  let requestPromise;
  if (coapEnabled && client.protocol === 'coap') {
    requestPromise = sendCoapRequest(client, method, path, payload, '', options);
  } else if (coapEnabled && client.protocol === 'dtls') {
    requestPromise = sendDTLSCoapRequest(client, method, path, payload, '', options);
  } else if (mqttEnabled && client.protocol === 'mqtt') {
    requestPromise = sendMqttRequest(client, method, path, payload, options);
  } else {
    return Promise.reject(`Unsupported protocol for client ${ep}`);
  }

  // Decode the response payload before returning
  return requestPromise.then((response) => {
    if(response?.socket?._isClosed == false){
      associateSocketToClient(ep,response.socket);
    }
    
    // Update client activity when we receive a response
    updateClientActivity(ep);
    
    try {
      decodedPayload = PayloadCodec.decode(response?.payload,options.format)
    } catch (err) {
      return Promise.reject(`Failed to decode payload: ${err.message}`);
    }

    sharedEmitter.emit('response', 
    { 
      protocol: client?.protocol,
      ep, 
      method, 
      path, 
      payload : decodedPayload, 
      options,
      code : response.code
    });

    // Return decoded response
    return {
      ep, 
      method, 
      path,
      token : response.token, 
      payload: decodedPayload, 
      options,
      code : response.code
    };
  });


  return Promise.reject(`Unsupported protocol for client ${ep}`);
}

// === Specific Methods ===

function discoveryRequest(ep, path = '/.well-known/core') {
  return dispatchRequest(ep, 'GET', path, null, { format: CONTENT_FORMATS.link });
}

function getRequest(ep, path, format = 'text') {
  return dispatchRequest(ep, 'GET', path, null, { format: CONTENT_FORMATS[format] });
}

function startObserveRequest(ep, path, observe = 0, format = 'text') {
  return dispatchRequest(ep, 'GET', path, null, { observe, format: CONTENT_FORMATS[format] })
    .then(({ token, code, socket }) => {
      try {
        // coapClient doesn't have callback right now
        // parseReceivedData func is called instead

        // Register the observation in the registry, including the socket for cleanup
        registerObservation(token, ep, path, format, socket);
        sharedEmitter.emit('startObservation', { ep, token: token.toString('hex'), path });
        return { token, ep, path, format};
      } catch (error) {
        throw new Error(`Register observation error: ${error.message}`);
      }
    })
    .catch((error) => {
      console.log(error)
      console.error(`[Start Observe Error] Failed to start observation for client "${ep}" on path "${path}": ${error.message}`);
      throw new Error(`Start Observe Request Error: ${error.message}`);
    });
}

function stopObserveRequest(ep, path, observe = 1, format = 'text') {
  const token = findTokenByEpAndPath(ep,path)
  return dispatchRequest(ep, 'GET', path, null, { observe, format: CONTENT_FORMATS[format], token})
  .then( ({token}) => {
    try{
      if(!token){
        token = findTokenByEpAndPath(ep, path)
      }
      deregisterObservation(token);
      sharedEmitter.emit('stopObservation', { ep, token : token.toString('hex'), path });
      return { token, ep, path, format};
    }catch(error){
      throw new Error(`Deregister error: ${error}`);
    }
  })
  .catch((error)=>{
    console.error(`[Stop Observe Error] Failed to stop observation for client "${ep}" on path "${path}": ${error.message}`);
    throw new Error(`Stop Observe request error: ${error}`);
  });
}

function putRequest(ep, path, payload, format = 'text') {
  return dispatchRequest(ep, 'PUT', path, payload, { format: CONTENT_FORMATS[format] });
}

function postRequest(ep, path, payload, format = 'text') {
  return dispatchRequest(ep, 'POST', path, payload, { format: CONTENT_FORMATS[format] });
}

function deleteRequest(ep, path) {
  return dispatchRequest(ep, 'DELETE', path);
}

function createRequest(ep, parentPath, payload, format = 'text') {
  return dispatchRequest(ep, 'POST', parentPath, payload, { format: CONTENT_FORMATS[format] });
}

function parseReceivedData(socket,protocol,data,validation,address=null,port=null){
  
  let packet = null;
  try{
    packet = coapPacket.parse(data);
  }catch(err){
    console.log(packet);
    console.log(err)
    return;
  }

  let response = false;
  let request = false;

  const uriHost = packet.options.find(option => option.name === 'Uri-Host');
  const uriPath = packet.options
    .filter(o => o.name === 'Uri-Path')
    .map(o => o.value.toString())
    .join('/');

  const host = uriHost ? "/" + Buffer.from(uriHost.value).toString('utf8') : "";
  const path = uriPath ? "/" + uriPath : "";
  const uriQueryParts = packet.options
  .filter(opt => opt.name === 'Uri-Query')
  .map(opt => opt.value.toString('utf8'));
  const token = Buffer.from(packet.token).toString('hex');
  const query = uriQueryParts.length ? '?' + uriQueryParts.join('&') : '';

  const method = {
    '0.01': 'GET',
    '0.02': 'POST',
    '0.03': 'PUT',
    '0.04': 'DELETE',
    '2.05': 'CONTENT',
    '4.04': 'NOT FOUND',
    '5.00': 'INTERNAL ERROR',
  }[packet.code] || 'UNKNOWN';

  let req = {
    url: path+query,
    rsinfo : {
      address : address || socket?.remoteAddress,
      port: port || socket?.remotePort
    },
    method: method,
    payload: packet.payload,
    headers: {},
    _packet: packet
  };
  
  // Convert packet options to headers for compatibility
  if (packet.options) {
    packet.options.forEach(option => {
      switch (option.name) {
        case 'Observe':
          req.headers.Observe = option.value;
          req.headers.observe = option.value;
          break;
        case 'Content-Format':
          req.headers['Content-Format'] = option.value;
          break;
      }
    });
  }
  
  const res = {
    code: '2.05',
    payload: null,
    options: [],
    headers: {},
    setOption: function(name, values) {
      // Store options for response
      if (!Array.isArray(values)) {
        this.options.push({
          name: name,
          value: Buffer.from([values])
        })
      } else {
        for (const value of values) {
          this.options.push({ name: name, value })
        }
      }
    },
    setHeader: function(name, value) {
      // Store headers for response
      this.headers[name] = value;
    },  

    end: function(data) {
      // Create CoAP response packet

      const responsePacket = {
        messageId: packet.messageId,
        token: packet.token,
        code: this.code,
        options: this.options,
        headers: this.headers,
        payload: Buffer.isBuffer(data) ? data : Buffer.from(data || this.payload || '')
      };

      // Generate CoAP response buffer
      const responseBuffer = coapPacket.generate(responsePacket);
      
      // Send encrypted response through DTLS socket
      if(protocol === 'coaps')
        try{
          socket.write(responseBuffer);
        }catch(err){
          console.log(`[COAP Server] ${protocol} error replying to: ${address}:${port}`);
          console.error(err);
        }
      else if(protocol === 'coap'){
        try{
          socket.send(responseBuffer,port,address,(err)=>{
            if(err){
              console.log(`[COAP Server] ${protocol} error replying to: ${address}:${port}`);
              console.error(err);
            }
            console.log(`[COAP Server] ${protocol} replied to: ${address}:${port}`);
          });
        }catch(err){
          console.log(`[COAP Server] error replying to: ${address}:${port}`);
          console.error(err);
        }
      }
      else{
        console.log(`[COAP Server]: protocol:${protocol} not known`);
      }
    }
  };

  switch (packet.code[0]) {
    case '0':
      console.log(`Client request: ${protocol} ${method} ${path}.`)
      request = true;
      break;
    case '2':
      console.log("Success response (2.xx): The request was successful.")
      response = true;
      break;
    case '4':
      console.log("Client Error response (4.xx): The request was invalid or cannot be served.");
      response = true;
      break;
    case '5':
      console.log("Server Error response (5.xx): The server failed to fulfill a valid request.");
      response = true;
      break;
    default:
      console.log("Client Code not known");
      return;
  }

  if(response === true){
    const msgSent = $.msgStore.get(token);
    if(msgSent){
      parseResponse(
        req,
        protocol,
        msgSent.ep,
        msgSent.msgId,
        msgSent.method,
        msgSent.path,
        packet.code,
        msgSent.format,
        msgSent.observe
      );
      $.msgStore.delete(token);
    }else{
      console.log(`msg associated with token: ${token} not found`);
    }
  }else if(request === true){
    createResponse(req,res,validation,protocol,method,path)
  }

}

function parseResponse(req,protocol,ep,msgId,method,path,code,format,observe=null){

  // Update client activity when we receive a response
  // find ep
  //updateClientActivity(ep);

  let formatStr = req.headers['Content-Format'];
  let formatInt = -1;
  let decodedPayload; // Added local declaration
  if(formatStr){
    if(Buffer.isBuffer(formatStr)){
      if (formatStr.length >= 2) {
        formatInt = formatStr.readUInt16BE(0);
      } else if (formatStr.length === 1) {
        formatInt = formatStr.readUInt8(0);
      }
    }
  }
  format = formatInt > -1 ? formatInt : format; // use format sent

  try {
    decodedPayload = PayloadCodec.decode(req.payload,CONTENT_FORMATS[format])
  } catch (err) {
    return Promise.reject(`Failed to decode payload: ${err.message}`);
  }

  let options = {
    format: CONTENT_FORMATS[format]
  }

  let token = null;
  if(req._packet?.token.length > 0)
    token = Buffer.from(req._packet.token,'hex')

  console.log(`response rcv ${req.rsinfo.address}:${req.rsinfo.port} 
    ep: ${ep}
    msgId: ${msgId}
    method: ${method} 
    path: ${path} 
    observe: ${observe} 
    format: ${format}
    token: ${token.toString('hex')}
    payload: ${JSON.stringify(decodedPayload)}
  `);

  // if response observe == 0 - observe start
  // if response observe == 1 and token = registered token - observe stop
  if(observe == 0){
    // payload is the actual vale of path
    sharedEmitter.emit('response', 
    { 
      protocol: protocol,
      ep, 
      method, 
      path, 
      payload : decodedPayload, 
      options,
      code
    });
    method = 'OBSERVE';
    decodedPayload = "Observation started"
    registerObservation(token, ep, path, format);
    sharedEmitter.emit('startObservation', { ep, token:token.toString('hex'), path });
  }else if(observe == 1){
    method = 'CANCEL-OBSERVE';
    deregisterObservation(token, ep, path, format);
    sharedEmitter.emit('stopObservation', { ep, token:token.toString('hex'), path });
  }

  sharedEmitter.emit('response', 
  { 
    protocol: protocol,
    ep, 
    method, 
    path, 
    payload : decodedPayload, 
    options,
    code
  });


}

function createResponse(req,res,validation,protocol,method,path){

  // Route to appropriate handler based on method and path
  if (method === 'GET' && path === '/time') { // for test porposes
    res.code = '2.05';
    res.end(new Date().toISOString());
    console.log(`[COAP Server] Responded to GET /time`); 
  }
  else if (method === 'POST' && path === '/rd') {

    handleRegister(req, res, protocol, validation)
      .then(({ ep, location }) => {
        sharedEmitter.emit('registration', { protocol, ep, location });
      })
      .catch((err) => {
        console.error(`[COAP Server Parser] Register error: ${err.message}`);
      });

  } else if (method === 'PUT' && path.startsWith('/rd/')) {
    handleUpdate(req, res, path)
      .then(({ ep, location }) => {
        sharedEmitter.emit('update', { protocol: 'coaps', ep, location });
      })
      .catch((err) => {
        console.error(`[COAP Server Parser] Update error: ${err.message}`);
      });

  } else if (method === 'DELETE' && path.startsWith('/rd/')) {
    handleDeregister(req, res, path)
      .then(({ ep }) => {
        sharedEmitter.emit('deregistration', { protocol: 'coaps', ep });
      })
      .catch((err) => {
        console.error(`[COAP Server Parser] Deregister error: ${err.message}`);
      });
      
  } else if (method === 'GET' && (req?.headers?.observe !== undefined || req?.headers?.Observe !== undefined)) {
    try {
      const { confirmable, token, options: packetOptions } = req._packet;
      const decodedToken = Buffer.from(token).toString('hex');
      const decodedPayload = PayloadCodec.decode(req?.payload, 'text/plain');

      const observation = getObservation(decodedToken);

      // Update client activity for observation data
      if (observation?.ep) {
        updateClientActivity(observation.ep);
      }

      // Emit the observation with useful details
      sharedEmitter.emit('observation', {
        protocol: 'dtls',
        token: decodedToken,
        ep: observation?.ep,
        method,
        path: observation?.path,
        payload: decodedPayload
      });

      if (!observation) {
        const error = `Observation is not registered for token ${decodedToken}`;
        res.code = '5.00';
        res.end('Observation token is not registered');
        sharedEmitter.emit('error', {
          error
        });
        return;
      }

      // Reply to confirmable observe request
      if (confirmable) {
        res.end(); // Empty ACK
      }

    } catch (err) {
      console.error(`[COAP Server Parser] Error handling observation:`, err);
      res.code = '5.00';
      res.end('Observation handler failed');
    }
    
  } else {
    res.code = '4.04';
    res.end('Not Found');
  }
}

module.exports = {
  startLwM2MCoapServer,
  startLwM2MDTLSCoapServer,
  startLwM2MMqttServer,
  discoveryRequest,
  getRequest,
  startObserveRequest,
  stopObserveRequest,
  putRequest,
  postRequest,
  deleteRequest,
  createRequest,
};
