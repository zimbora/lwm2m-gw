// server/serverMqttGw.js

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
    client: process.env.MQTT_GW__CLIENT || 'lwm2m-gw',
  },
};

var mqtt = require('mqtt');

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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

async function getInfo(clientEp) {
  // Delay to wait for client registration

  setTimeout(async () => {
    const client = clientEp;
    //console.log(`sending requests to client: ${client}`)

    try {
      // Read
      await discoveryRequest(clientEp);

      await getRequest(clientEp, '/3/0/0');

      await getRequest(clientEp, '/3303/0/5601');

      // Observe timestamp
      await startObserveRequest(clientEp, '/6/0/7');

      // Observe Temperature
      await startObserveRequest(clientEp, '/3303/0/5700');

      // Write
      setTimeout(() => putRequest(clientEp, '/3303/0/5601', '-30.0'), 2000);

      setTimeout(() => getRequest(clientEp, '/3303/0/5601'), 3000);
    } catch (error) {
      console.error(error);
    }
    // Execute
    //setTimeout(() => sendCoapRequest(client, 'POST', '/3/0/2'), 9000);
  }, 2000);

  setTimeout(() => {
    const client = clientEp;
    try {
      getRequest(clientEp, '/3303/0/5601');
    } catch (error) {
      console.error(error);
    }
  }, 10000);
}

if ($.config?.mqttGw?.enabled) {
  $.mqttGwClient = mqtt.connect({
    protocolId: $.config?.mqttGw?.protocol,
    host: $.config?.mqttGw?.host,
    port: $.config?.mqttGw?.port,
    username: $.config?.mqttGw?.user,
    password: $.config?.mqttGw?.pwd,
    clientId: $.config?.mqttGw?.client,
  });

  $.mqttGwClient.on('connect', function () {
    console.log(
      `mqtt connected to: ${$.config?.mqttGw?.protocol}:${$.config?.mqttGw?.host}:${$.config?.mqttGw?.port}`
    );

    $.mqttGwClient.subscribe(`${$.config?.mqttGw?.project}/#`, function (err) {
      if (err) {
        console.log(err);
      }
    });
  });

  $.mqttGwClient.on('message', function (topic, message) {
    // message is Buffer
    //console.log(topic.toString(),message.toString())
  });

  $.mqttGwClient.on('error', function (error) {
    console.log('error:', error);
  });

  $.mqttGwClient.on('close', function () {
    console.log('mqtt closed');
  });
}

// Listen for registration events
sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(
    `[Event] Client registered via ${protocol}: ${ep} at ${location}`
  );
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/registered`;
    const payload = { location: location };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
  getInfo(ep);
});

// Listen for update events
sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[Event] Client updated via ${protocol}: ${ep} at ${location}`);
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/updated`;
    const payload = { location: location };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
});

// Listen for deregistration events
sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[Event] Client deregistered via ${protocol}: ${ep}`);
  if ($.config?.mqttGw?.enabled) {
    const topic = `${$.config?.mqttGw?.project}/${ep}/deregistered`;
    const payload = { location: location };
    $.mqttGwClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }
});

sharedEmitter.on(
  'observation',
  ({ protocol, ep, token, method, path, payload }) => {
    if (!ep) {
      return;
    }

    console.log(
      `[Event Observation] Data received via: ${ep}/${method}${path}`
    );
    console.log(`[Event Observation] payload: ${payload}`);
    if ($.config?.mqttGw?.enabled && path) {
      // convert path to string
      const topic = `${$.config?.mqttGw?.project}/${ep}/sensor${path}`;
      let data = null;
      if (typeof payload === 'object') {
        data = payload;
      } else {
        data = { value: payload };
      }
      $.mqttGwClient.publish(topic, JSON.stringify(data), { qos: 1 });
    }
  }
);

sharedEmitter.on(
  'response',
  ({ protocol, ep, method, path, payload, options, code }) => {
    //console.log(options)
    if (!code.startsWith('2.')) {
      if ($.config?.mqttGw?.enabled) {
        const topic = `${$.config?.mqttGw?.project}/${ep}/sensor${path}`;
        const data = null;
        const errorStr = {
          error: payload,
        };
        $.mqttGwClient.publish(topic, JSON.stringify(errorStr), { qos: 1 });
      }
      return;
    }
    if (path == '/.well-known/core') {
      if ($.config?.mqttGw?.enabled) {
        // convert path to string
        if (Array.isArray(payload)) {
          payload.forEach((object) => {
            const topic = `${$.config?.mqttGw?.project}/${ep}/sensors${object?.path}`;
            const payloadStr = JSON.stringify(object?.attributes);
            $.mqttGwClient.publish(topic, payloadStr, { qos: 1 });
          });
        }
      }
    } else {
      console.log(
        `[Event] Client response ${protocol}: ${ep}/${method}${path}`
      );
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
        $.mqttGwClient.publish(topic, JSON.stringify(data), { qos: 1 });
      }
    }
  }
);

sharedEmitter.on('error', (error) => {
  console.error(error);
});

// Define a validation function
function validateRegistration(ep, options) {
  console.log(`[Validation] Validating registration for endpoint: ${ep}`);

  // Example validation logic
  if (!ep || ep.length < 3) {
    console.error(`[Validation Failed] Endpoint "${ep}" is invalid`);
    return false;
  }

  // Add more custom validation logic as needed
  return true;
}

console.log($.config);

startLwM2MCoapServer((validation = validateRegistration));

startLwM2MMqttServer('mqtt://broker.hivemq.com', {
  port: 1883,
  username: 'myuser',
  password: 'mypassword',
  clientId: 'myLwM2MMqttServer',
})
  .then((mqttClient) => {
    console.log('MQTT LwM2M server is running.');
  })
  .catch((err) => {
    console.error('Failed to start MQTT LwM2M server:', err.message);
  });

setInterval(() => {
  console.log('[Server] Registered clients:', listClients());
}, 60000);
