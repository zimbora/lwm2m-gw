const mqtt = require('mqtt');
const sharedEmitter = require('./sharedEmitter');

/* Example
connectMqttClient('mqtt://broker.hivemq.com', {
  port: 1883,
  username: 'myuser',
  password: 'mypassword',
  clientId: 'myClientId123'
}).then(client => {
  console.log('MQTT connected');
}).catch(console.error);
*/

function connectMqttClient(
  brokerUrl,
  { port, username, password, clientId } = {}
) {
  return new Promise((resolve, reject) => {
    const options = {};

    if (port) {
      options.port = port;
    }
    if (username) {
      options.username = username;
    }
    if (password) {
      options.password = password;
    }
    if (clientId) {
      options.clientId = clientId;
    }

    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => resolve(client));
    client.on('error', (err) => reject(err));
  });
}

function sendMqttRequest(client, method, path, payload = null, options = {}) {
  return new Promise((resolve, reject) => {
    if (!client.mqttClient || typeof client.mqttClient.publish !== 'function') {
      return reject(
        `MQTT client for ${client.endpoint} is not valid or not connected`
      );
    }

    const topic = `${client.baseTopic || 'lwm2m'}/${client.endpoint}/${method}${path}`;
    const message = {
      method,
      path,
      payload,
      format: options.format || 'text/plain',
      observe: options?.observe !== undefined ? options.observe : undefined,
      query: query !== undefined ? query : undefined,
      timestamp: Date.now(),
    };

    const responseTopic = `${client.baseTopic || 'lwm2m'}/${client.endpoint}/response/${method}${path}`;

    // Use the shared emitter
    const emitter = sharedEmitter;

    // Subscribe to the response topic
    client.mqttClient.subscribe(responseTopic, (err) => {
      if (err) {
        return reject(err);
      }

      const timeout = setTimeout(() => {
        client.mqttClient.removeListener('message', handleMessage);
        reject(`MQTT request to ${topic} timed out`);
      }, 5000);

      function handleMessage(topicReceived, messageBuffer) {
        if (topicReceived === responseTopic) {
          try {
            const message = messageBuffer.toString();
            const parsed = JSON.parse(message);

            if (options.observe) {
              emitter.emit('observation', {
                ep: client.endpoint,
                method,
                path,
                payload: parsed,
              });
            } else {
              clearTimeout(timeout);
              client.mqttClient.removeListener('message', handleMessage);
              resolve(parsed);
            }
          } catch (e) {
            clearTimeout(timeout);
            client.mqttClient.removeListener('message', handleMessage);
            reject(e);
          }
        }
      }

      client.mqttClient.on('message', handleMessage);

      // Publish the request
      client.mqttClient.publish(
        topic,
        JSON.stringify(message),
        { qos: 1 },
        (err) => {
          if (err) {
            clearTimeout(timeout);
            client.mqttClient.removeListener('message', handleMessage);
            reject(err);
          }
        }
      );
    });
  });
}

module.exports = {
  connectMqttClient,
  sendMqttRequest,
};
