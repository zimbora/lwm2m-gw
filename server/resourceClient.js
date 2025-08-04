// server/resourceClient.js
const coap = require('coap');
const sharedEmitter = require('./transport/sharedEmitter');
const { sendCoapRequest } = require('./transport/coapClient');
const { connectMqttClient, sendMqttRequest } = require('./transport/mqttClient');
const { handleRegister, handleUpdate, handleDeregister} = require('./handleRegistration');
const { registerObservation, getObservation, deregisterObservation } = require('./observationRegistry');
const PayloadCodec = require('../utils/payloadCodec');
const CONTENT_FORMATS = require('../utils/contentFormats');

const { 
  getClient,
} = require('./clientRegistry');

const coapEnabled = true;
const mqttEnabled = false;

function startLwM2MDTLSCoapServer(validation, port = 5684) {

  const server = coap.createServer((req, res) => {

  });
  return server;
}

// === method to initialize client based on protocol ===
function startLwM2MCoapServer(validation, port = 5683) {
  const server = coap.createServer((req, res) => {
    const path = req?.url.split('?')[0];
    const method = req?.method;

    if (method === 'POST' && path === '/rd') {
      handleRegister(req, res, 'coap', validation)
        .then(({ ep, location }) => {
          sharedEmitter.emit('registration', { protocol: 'coap', ep, location });
        })
        .catch((err) => {
          console.error(`[CoAP Server] Register error: ${err.message}`);
        });

    } else if (method === 'PUT' && path.startsWith('/rd/')) {
      handleUpdate(req, res, path)
        .then(({ ep, location }) => {
          sharedEmitter.emit('update', { protocol: 'coap', ep, location });
        })
        .catch((err) => {
          console.error(`[CoAP Server] Update error: ${err.message}`);
        });

    } else if (method === 'DELETE' && path.startsWith('/rd/')) {
      handleDeregister(req, res, path)
        .then(({ ep }) => {
          sharedEmitter.emit('deregistration', { protocol: 'coap', ep });
        })
        .catch((err) => {
          console.error(`[CoAP Server] Deregister error: ${err.message}`);
        });
    } else if (method === 'GET' && (req?.headers?.observe !== undefined || req?.headers?.Observe !== undefined) ) {
      try {
        const { confirmable, token, options: packetOptions } = req._packet;
        const decodedToken = Buffer.from(token).toString('hex');
        const decodedPayload = PayloadCodec.decode(req?.payload, 'text/plain');

        const observation = getObservation(decodedToken);

        // Emit the observation with useful details
        sharedEmitter.emit('observation', {
          protocol: 'coap',
          token : decodedToken,
          ep: observation?.ep,
          method,
          path: observation?.path,
          payload: decodedPayload
        });

        if(!observation){
          const error = `Observation is not registered for token ${decodedToken}`
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
        console.error(`[Observation] Error handling observation:`, err);
        res.code = '5.00';
        res.end('Observation handler failed');
      }
        
    } else {
      res.code = '4.04';
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`[CoAP] LwM2M Server listening on port ${port}`);
  });

  return server;
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
  } else if (mqttEnabled && client.protocol === 'mqtt') {
    requestPromise = sendMqttRequest(client, method, path, payload, options);
  } else {
    return Promise.reject(`Unsupported protocol for client ${ep}`);
  }

  // Decode the response payload before returning
  return requestPromise.then((response) => {
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
      payload: decodedPayload, 
      options
    });

    // Return decoded response
    return {
      ep, 
      method, 
      path,
      token : response.token, 
      payload: decodedPayload, 
      options
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
    .then(({ token }) => {
      try {
        // Register the observation in the registry
        registerObservation(token, ep, path, format);
        return { token, ep, path, format};
      } catch (error) {
        throw new Error(`Register observation error: ${error.message}`);
      }
    })
    .catch((error) => {
      console.error(`[Start Observe Error] Failed to start observation for client "${ep}" on path "${path}": ${error.message}`);
      throw new Error(`Start Observe Request Error: ${error.message}`);
    });
}

function stopObserveRequest(ep, path, observe = 1, format = 'text') {
  return dispatchRequest(ep, 'GET', path, null, { observe, format: CONTENT_FORMATS[format] })
  .then( ({token}) => {
    try{
      deregisterObservation(token);
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



module.exports = {
  startLwM2MDTLSCoapServer,
  startLwM2MCoapServer,
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