
// client/registration.js
const coap = require('coap');
const { getSocket } = require('./resourceServer');

let registrationLocation = null;

function registerToServer(endpointName, serverHost, serverPort, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    //const agent = new coap.Agent({ socket: getSocket() }); // share server socket
    const agent = new coap.Agent(); // share server socket

    const req = coap.request({
      hostname: serverHost,
      port: serverPort,
      pathname: '/rd',
      method: 'POST',
      query: `ep=${endpointName}&lt=300&b=U`,
      agent
    });

    let timeout = setTimeout(() => {
      //req.abort(); // cancel the CoAP request
      reject(new Error('Server did not respond to registration (timeout)'));
    }, timeoutMs);

    req.setOption('Content-Format', 'application/link-format');
    req.write('</3/0>,</3303/0>'); // Example object links

    req.on('response', (res) => {
      if (res.code !== '2.01') {
        $.logger.error(`[Client] Registration failed: ${res.code}`);
        $.logger.error(res);
        return reject(new Error(res.payload.toString()));
      }

      const location = res.options.find(opt => opt.name === 'Location-Path');
      if (!location) return reject(new Error('No Location-Path in response'));

      const path = res.options
        .filter(o => o.name === 'Location-Path')
        .map(o => o.value.toString())
        .join('/');

      registrationLocation = `/` + path;
      $.logger.info(`[Client] Registered with server. Location: ${path}`);
      resolve();
    });

    req.on('error', reject);
    req.end();

  });
}

function updateRegistration(host, port = 5683, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    if (!registrationLocation) return reject('Not registered.');

    const req = coap.request({
      hostname: host,
      port,
      method: 'POST',
      pathname: registrationLocation,
      confirmable: true,
    });

    let timeout = setTimeout(() => {
      //req.abort(); // cancel the CoAP request
      reject(new Error('Server did not respond to registration update (timeout)'));
    }, timeoutMs);

    req.on('response', (res) => {
      $.logger.info(`[Client] Sent Update. Response code: ${res.code}`);
      resolve();
    });

    req.on('error', (error) => {
      $.logger.info(`[Client] Error Updating registration: ${error}`);
      reject(error);
    });
    req.end();
  });
}

function deregister(host, port = 5683, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    if (!registrationLocation) return reject('Not registered.');

    const req = coap.request({
      hostname: host,
      port,
      method: 'DELETE',
      pathname: registrationLocation,
      confirmable: true,
    });

    let timeout = setTimeout(() => {
      //req.abort(); // cancel the CoAP request
      reject(new Error('Server did not respond to deregistration (timeout)'));
    }, timeoutMs);

    req.on('response', (res) => {
      $.logger.info(`[Client] Sent Deregister. Response code: ${res.code}`);
      resolve();
    });

    req.on('error', reject);
    req.end();
  });
}

function _resetRegistration() {
  registrationLocation = null;
}

module.exports = {
  registerToServer,
  updateRegistration,
  deregister,
  _resetRegistration
};