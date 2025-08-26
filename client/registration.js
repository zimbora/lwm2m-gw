// client/registration.js
const coap = require('coap');
const { getSocket } = require('./resourceServer');
const { sendDTLSCoapRequest } = require('./transport/dtlsServer');

let registrationLocation = null;

function registerToServer(
  endpointName,
  serverHost,
  serverPort,
  localPort = 5683,
  timeoutMs = 1000,
  protocol = 'coap'
) {
  $.logger.debug(`Register on server: ${serverHost}:${serverPort}`);
  return new Promise((resolve, reject) => {
    if (protocol === 'coaps') {
      // Use DTLS request for coaps
      sendDTLSCoapRequest(
        {
          hostname: serverHost,
          port: serverPort,
          pathname: '/rd',
          method: 'POST',
          query: `ep=${endpointName}&lt=300&b=U&port=${localPort}`,
        },
        (err, res) => {
          $.logger.debug(
            `Response Register on server: ${serverHost}:${serverPort}`
          );
          if (err) {
            return reject(err);
          }
          if (res.code !== '2.01') {
            $.logger.error(`[Client] Registration failed: ${res.code}`);
            $.logger.error(res.payload.toString());
            return reject(new Error(res.payload.toString()));
          }
          const location = res.options.find(
            (opt) => opt.name === 'Location-Path'
          );
          if (!location) {
            return reject(new Error('No Location-Path in response'));
          }
          const path = res.options
            .filter((o) => o.name === 'Location-Path')
            .map((o) => o.value.toString())
            .join('/');
          registrationLocation = `/` + path;
          $.logger.info(`[Client] Registered with server. Location: ${path}`);
          return resolve();
        }
      );
    } else {
      const agent = new coap.Agent(); // share server socket
      const req = coap.request({
        hostname: serverHost,
        port: serverPort,
        pathname: '/rd',
        method: 'POST',
        query: `ep=${endpointName}&lt=300&b=U&port=${localPort}`,
        agent,
      });

      const timeout = setTimeout(() => {
        //req.abort(); // cancel the CoAP request
        reject(new Error('Server did not respond to registration (timeout)'));
      }, timeoutMs);

      req.setOption('Content-Format', 'application/link-format');
      req.write('</3/0>,</3303/0>'); // Example object links

      req.on('response', (res) => {
        clearTimeout(timeout); // cancel the scheduled timeout
        if (res.code !== '2.01') {
          $.logger.error(`[Client] Registration failed: ${res.code}`);
          $.logger.error(res.payload.toString());
          return reject(new Error(res.payload.toString()));
        }

        const location = res.options.find(
          (opt) => opt.name === 'Location-Path'
        );
        if (!location) {
          return reject(new Error('No Location-Path in response'));
        }

        const path = res.options
          .filter((o) => o.name === 'Location-Path')
          .map((o) => o.value.toString())
          .join('/');

        registrationLocation = `/` + path;
        $.logger.info(`[Client] Registered with server. Location: ${path}`);
        resolve();
      });

      req.on('error', (err) => {
        clearTimeout(timeout); // cancel the scheduled timeout
        return reject(err);
      });

      req.end();
    }
  });
}

function updateRegistration(
  host,
  port = 5683,
  timeoutMs = 300,
  protocol = 'coap'
) {
  return new Promise((resolve, reject) => {
    if (!registrationLocation) {
      return reject('Not registered.');
    }

    const timeout = setTimeout(() => {
      //req.abort(); // cancel the CoAP request
      reject(
        new Error('Server did not respond to registration update (timeout)')
      );
    }, 500);

    if (protocol === 'coaps') {
      // Use DTLS request for coaps
      sendDTLSCoapRequest(
        {
          hostname: host,
          port,
          pathname: registrationLocation,
          method: 'PUT',
        },
        (err, res) => {
          clearTimeout(timeout); // cancel the scheduled timeout
          if (err) {
            return reject(err);
          }
          if (res.code !== '2.04') {
            $.logger.error(`[Client] Error Updating registration: ${res.code}`);
            return reject(new Error(res.payload.toString()));
          }
          $.logger.info(
            `[Client] Registration update. Location: ${registrationLocation}`
          );
          resolve();
        }
      );
      return;
    } else {
      const req = coap.request({
        hostname: host,
        port,
        method: 'PUT',
        pathname: registrationLocation,
        confirmable: true,
      });

      const timeout = setTimeout(() => {
        //req.abort(); // cancel the CoAP request
        clearTimeout(timeout); // cancel the scheduled timeout
        return reject(
          new Error('Server did not respond to registration update (timeout)')
        );
      }, timeoutMs);

      req.on('response', (res) => {
        clearTimeout(timeout); // cancel the scheduled timeout
        $.logger.info(`[Client] Sent Update. Response code: ${res.code}`);
        if (res.code != '2.04') {
          return reject(new Error('Update registration failed'));
        }
        return resolve();
      });

      req.on('error', (error) => {
        $.logger.info(`[Client] Error Updating registration: ${error}`);
        clearTimeout(timeout); // cancel the scheduled timeout
        return reject(error);
      });

      req.end();
    }
  });
}

function deregister(host, port = 5683, timeoutMs = 300, protocol) {
  return new Promise((resolve, reject) => {
    if (!registrationLocation) {
      return reject('Not registered.');
    }

    const timeout = setTimeout(() => {
      //req.abort(); // cancel the CoAP request
      clearTimeout(timeout); // cancel the scheduled timeout
      return reject(
        new Error('Server did not respond to deregistration (timeout)')
      );
    }, timeoutMs);

    if (protocol === 'coaps') {
      // Use DTLS request for coaps
      sendDTLSCoapRequest(
        {
          hostname: host,
          port,
          pathname: registrationLocation,
          confirmable: true,
          method: 'DELETE',
        },
        (err, res) => {
          clearTimeout(timeout); // cancel the scheduled timeout
          if (err) {
            return reject(err);
          }
          if (res.code !== '2.02') {
            $.logger.error(`[Client] Error Deregistering: ${res.code}`);
            $.logger.error(res);
            return reject(new Error(res.payload.toString()));
          }
          $.logger.info(`[Client] Deregistered on location: ${path}`);
          resolve();
        }
      );
      return;
    } else {
      const req = coap.request({
        hostname: host,
        port,
        method: 'DELETE',
        pathname: registrationLocation,
        confirmable: true,
      });

      req.on('response', (res) => {
        clearTimeout(timeout); // cancel the scheduled timeout
        $.logger.info(`[Client] Sent Deregister. Response code: ${res.code}`);
        return resolve();
      });

      req.on('error', (error) => {
        $.logger.info(`[Client] Error Deregistering: ${error}`);
        clearTimeout(timeout); // cancel the scheduled timeout
        return reject(error);
      });
      req.end();
    }
  });
}

function _resetRegistration() {
  registrationLocation = null;
}

module.exports = {
  registerToServer,
  updateRegistration,
  deregister,
  _resetRegistration,
};
