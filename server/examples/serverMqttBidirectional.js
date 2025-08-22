// server/examples/serverMqttBidirectional.js

/**
 * Enhanced LwM2M MQTT Gateway with Bidirectional Communication
 * 
 * This example demonstrates how to use the MQTT Request Handler
 * for bidirectional communication between MQTT clients and LwM2M devices.
 * 
 * Features:
 * - Existing outbound data publishing (device data to MQTT)
 * - New inbound request handling (MQTT requests to devices)
 * - Topic structure for requests and responses
 * 
 * Topic Structure:
 * - Device data (outbound): {project}/{endpoint}/sensor{path}
 * - Device events (outbound): {project}/{endpoint}/registered|updated|deregistered
 * - Request to device (inbound): {project}/requests/{endpoint}/{method}{path}
 * - Response from device (outbound): {project}/responses/{endpoint}/{method}{path}
 */

global.$ = {};
$.mqttGwClient = {};

$.config = {
  mqttGw: {
    enabled: process.env.MQTT_GW_ENABLED || true,
    project: process.env.MQTT_GW_PROJECT || 'lwm2m',
    protocol: process.env.MQTT_GW_PROTOCOL || 'MQTT',
    host: process.env.MQTT_GW__HOST || 'localhost',
    port: process.env.MQTT_GW__PORT || '1883',
    user: process.env.MQTT_GW__USER || '',
    pwd: process.env.MQTT_GW__PWD || '',
    client: process.env.MQTT_GW__CLIENT || 'lwm2m-gw'
  }
};

const mqtt = require('mqtt');
const MqttRequestHandler = require('../mqttRequestHandler');

const { 
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
} = require('../resourceClient');

const sharedEmitter = require('../transport/sharedEmitter');
const { listClients } = require('../clientRegistry');

async function getInfo(clientEp) {
  // Delay to wait for client registration
  setTimeout(async () => {
    const client = clientEp;
    console.log(`[Auto Request] Sending requests to client: ${client}`);

    try {
      // Read device info
      //await discoveryRequest(clientEp);
      await getRequest(clientEp, '/3/0/0');
      await getRequest(clientEp, '/3303/0/5601');

      // Start observations
      await startObserveRequest(clientEp, '/6/0/7');
      await startObserveRequest(clientEp, '/3303/0/5700');

      // Example write operation
      setTimeout(() => putRequest(clientEp, '/3303/0/5601', "-30.0"), 2000);
      setTimeout(() => getRequest(clientEp, '/3303/0/5601'), 3000);
    } catch (error) {
      console.error('[Auto Request] Error:', error);
    }
  }, 2000);

  setTimeout(() => {
    try {
      getRequest(clientEp, '/3303/0/5601');
    } catch (error) {
      console.error('[Auto Request] Error:', error);
    }
  }, 10000);
}

// Initialize outbound MQTT client (for publishing device data)
if ($.config?.mqttGw?.enabled) {
  $.mqttGwClient = mqtt.connect({
    protocolId: $.config?.mqttGw?.protocol,
    host: $.config?.mqttGw?.host,
    port: $.config?.mqttGw?.port,
    username: $.config?.mqttGw?.user,
    password: $.config?.mqttGw?.pwd,
    clientId: $.config?.mqttGw?.client
  });

  mqttRequestHandler = null;
  
  $.mqttGwClient.on('connect', function () {
    console.log(`[MQTT Gateway] Connected to: ${$.config?.mqttGw?.protocol}:${$.config?.mqttGw?.host}:${$.config?.mqttGw?.port}`);
    
    // Initialize MQTT Request Handler
    mqttRequestHandler = new MqttRequestHandler($.mqttGwClient, $.config.mqttGw);

    // Subscribe to all topics for monitoring (optional)
    $.mqttGwClient.subscribe(`${$.config?.mqttGw?.project}/requests/#`, function (err) {
      if (err) console.log('[MQTT Gateway] Subscribe error:', err);
    });
  });

  $.mqttGwClient.on('message', function (topic, message) {
    // Log all MQTT messages for debugging (optional)
    console.log(`[MQTT Gateway] Received: ${topic} -> ${message.toString()}`);
    mqttRequestHandler.handleIncomingRequest(topic, message);
  });

  $.mqttGwClient.on('error', function (error) {
    console.log('[MQTT Gateway] Error:', error);
  });

  $.mqttGwClient.on('close', function () {
    console.log('[MQTT Gateway] Connection closed');
  });
}

// === LwM2M Event Handlers (Outbound to MQTT) ===

// Listen for registration events
sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(`[Event] Client registered via ${protocol}: ${ep} at ${location}`);
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/registered`;
    const payload = { location: location, timestamp: Date.now() };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
  getInfo(ep);
});

// Listen for update events
sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[Event] Client updated via ${protocol}: ${ep} at ${location}`);
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/updated`;
    const payload = { location: location, timestamp: Date.now() };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
});

// Listen for deregistration events
sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[Event] Client deregistered via ${protocol}: ${ep}`);
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/deregistered`;
    const payload = { timestamp: Date.now() };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
});

// Listen for observation data
sharedEmitter.on('observation', ({ protocol, ep, token, method, path, payload }) => {
  if (!ep) return;

  console.log(`[Event Observation] Data received via: ${ep}/${method}${path}`);
  console.log(`[Event Observation] Payload: ${payload}`);
  
  if ($.config?.mqttGw?.enabled && path) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/sensor${path}`;
    let data = null;
    if (typeof payload === 'object') {
      data = payload;
    } else {
      data = { value: payload };
    }
    data.timestamp = Date.now();
    $.mqttGwClient.publish(topic, JSON.stringify(data), { qos: 1 });
  }
});

// Listen for response data
sharedEmitter.on('response', ({ protocol, ep, method, path, payload, options, code }) => {
  if (!code.startsWith('2.')) {
    if ($.config?.mqttGw?.enabled) {
      const topic = `${$.config?.mqttGw?.project}/${ep}/sensor${path}`;
      const errorStr = {
        error: payload,
        timestamp: Date.now()
      };
      $.mqttGwClient.publish(topic, JSON.stringify(errorStr), { qos: 1 });
    }
    return;
  }
  
  if (path === "/.well-known/core") {
    if ($.config?.mqttGw?.enabled) {
      if (Array.isArray(payload)) {
        payload.forEach((object) => {
          const topic = `${$.config?.mqttGw?.project}/${ep}/sensors${object?.path}`;
          const payloadStr = JSON.stringify({
            attributes: object?.attributes,
            timestamp: Date.now()
          });
          $.mqttGwClient.publish(topic, payloadStr, { qos: 1 });
        });
      }
    }
  } else {
    console.log(`[Event] Client response ${protocol}: ${ep}/${method}${path}`);
    if (payload != null) {
      console.log(`[Event] Client payload ${payload}`);
    }
    
    if ($.config?.mqttGw?.enabled) {
      const topic = `${$.config?.mqttGw?.project}/${ep}/sensor${path}`;
      let data = null;
      if (typeof payload === 'object') {
        data = payload;
      } else {
        data = { value: payload };
      }
      data.timestamp = Date.now();
      $.mqttGwClient.publish(topic, JSON.stringify(data), { qos: 1 });
    }
  }
});

sharedEmitter.on('error', (error) => {
  console.error('[Event] Error:', error);
});

// Define a validation function
function validateRegistration(ep, options) {
  console.log(`[Validation] Validating registration for endpoint: ${ep}`);
  
  if (!ep || ep.length < 3) {
    console.error(`[Validation Failed] Endpoint "${ep}" is invalid`);
    return false;
  }

  return true;
}

// === Startup ===

console.log('[Startup] Configuration:', $.config);

// Start LwM2M servers
startLwM2MCoapServer(validateRegistration);

// Periodic client list
setInterval(() => {
  const clients = listClients();
  console.log('[Server] Registered clients:', clients);
  
  // Optionally publish client list to MQTT
  if ($.config?.mqttGw?.enabled && clients.length > 0) {
    const topic = `${$.config?.mqttGw?.project}/server/clients`;
    const payload = {
      clients: clients,
      timestamp: Date.now()
    };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
}, 60000);


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Shutdown] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

console.log('[Startup] Enhanced LwM2M MQTT Gateway with bidirectional communication started.');
console.log('[Info] Send MQTT requests to: {project}/requests/{endpoint}/{method}{path}');
console.log('[Info] Receive responses on: {project}/responses/{endpoint}/{method}{path}');
console.log('[Info] Device data published to: {project}/{endpoint}/sensor{path}');