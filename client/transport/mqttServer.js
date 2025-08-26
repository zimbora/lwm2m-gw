// client/mqttServer.js

const mqtt = require('mqtt');

let client;
const observers = {}; // key: path, value: array of observer objects (here, just subscriber clientIds)

function createServer(
  handler,
  options = { brokerUrl: 'mqtt://localhost:1883', clientId: 'lwm2m-server' }
) {
  client = mqtt.connect(options.brokerUrl, { clientId: options.clientId });

  client.on('connect', () => {
    $.logger.info(
      `[Client] MQTT Resource server connected to broker ${options.brokerUrl}`
    );
    // Subscribe to all resource request topics
    client.subscribe('lwm2m/requests/#', (err) => {
      if (err) {
        $.logger.error('[Client] MQTT subscribe error:', err);
      }
    });
  });

  client.on('message', (topic, messageBuffer) => {
    // Example topic: lwm2m/requests/3/0/0 (object/instance/resource)
    const topicParts = topic.split('/');
    if (
      topicParts.length < 4 ||
      topicParts[0] !== 'lwm2m' ||
      topicParts[1] !== 'requests'
    ) {
      return;
    }

    const path = topicParts.slice(2).join('/'); // e.g. "3/0/0"
    let payload;
    try {
      payload = JSON.parse(messageBuffer.toString());
    } catch {
      payload = messageBuffer.toString();
    }

    // Handler signature: handler(path, payload, publishResponse)
    // publishResponse: (path, responsePayload) => void
    if (handler && typeof handler === 'function') {
      handler(path, payload, (responsePath, responsePayload) => {
        // Publish response to a corresponding response topic
        const responseTopic = `lwm2m/responses/${responsePath}`;
        client.publish(
          responseTopic,
          typeof responsePayload === 'string'
            ? responsePayload
            : JSON.stringify(responsePayload)
        );
      });
    }
  });

  return client;
}

function sendNotification(observer, path, value) {
  if (!$.client.registered) {
    return;
  }

  $.logger.info(`[Client] Sending MQTT notification for ${path}: ${value}`);

  // Notify on MQTT topic for that observer (subscriber)
  // Assuming observer.address is clientId or similar unique id
  // Publish to a specific topic they subscribe to, e.g. `lwm2m/notify/{clientId}/{path}`
  const notifyTopic = `lwm2m/notify/${observer.clientId}/${path}`;
  client.publish(notifyTopic, String(value));
}

function stopObservation(resource) {
  if (resource?._interval) {
    clearInterval(resource._interval);
    delete resource._interval;
  }
}

function getObservers() {
  return observers;
}

function getClient() {
  return client;
}

module.exports = {
  createServer,
  sendNotification,
  stopObservation,
  getObservers,
  getClient,
};
