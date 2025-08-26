// client/coapServer.js

const coap = require('coap');

let server;
const observers = {}; // key: path, value: array of observer objects

function createServer(handler, port = 56830) {
  server = coap.createServer(handler);
  server.listen(port, () => {
    $.logger.info(
      `[Client] Resource server with Observe support on port ${port}`
    );
  });
  return server;
}

// Notifications are being sent to server lwm2m default port
function sendNotification(observer, path, value) {
  if (!$.client.registered) {
    return;
  }

  $.logger.info(
    `[Client] Sending notification for ${path}: ${value} with token: ${observer.token}`
  );

  const req = coap.request({
    hostname: observer.address,
    port: observer.port,
    method: 'GET',
    confirmable: true,
    pathname: '/' + path,
    token: Buffer.from(observer.token, 'hex'),
  });

  req.setOption('Observe', observer.observeSeq & 0xffffff);
  req.setOption('Content-Format', 'text/plain');
  req.write(String(value));
  req.end();

  observer.observeSeq++;
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

function getServer() {
  return server;
}

module.exports = {
  createServer,
  sendNotification,
  stopObservation,
  getObservers,
  getServer,
};
