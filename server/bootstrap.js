// server/bootstrap.js
const coap = require('coap');
const { handleBootstrapRequest, handleBootstrapFinish } = require('./handleBootstrap');
const sharedEmitter = require('./transport/sharedEmitter');

const BOOTSTRAP_PORT = 5783; // Standard LwM2M Bootstrap port

/**
 * LwM2M Bootstrap Server
 * 
 * Features:
 * - Provisioning Credentials: Supplies initial security credentials
 * - Device Configuration: Provides configuration parameters  
 * - Initial Registration: Facilitates initial registration process
 * - Security Management: Manages security object provisioning
 */

function startBootstrapServer(bootstrapDeviceCall = null, port = BOOTSTRAP_PORT) {

  const server = coap.createServer((req, res) => {
    const path = req?.url.split('?')[0];
    const method = req?.method;

    console.log(`[Bootstrap Server] ${method} ${path}`);

    if (method === 'POST' && path === '/bs') {
      // Handle bootstrap request
      handleBootstrapRequest(req, res, bootstrapDeviceCall)
        .then(({ ep }) => {
          sharedEmitter.emit('bootstrap-request', { protocol: 'coap', ep });
        })
        .catch((err) => {
          console.error(`[Bootstrap Server] Bootstrap request error: ${err.message}`);
        });

    } else if (method === 'POST' && path === '/bs-finish') {
      // Handle bootstrap finish
      handleBootstrapFinish(req, res)
        .then(({ ep }) => {
          sharedEmitter.emit('bootstrap-finish', { protocol: 'coap', ep });
        })
        .catch((err) => {
          console.error(`[Bootstrap Server] Bootstrap finish error: ${err.message}`);
        });

    } else {
      // Unsupported path/method
      res.code = '4.04';
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`[Bootstrap] LwM2M Bootstrap Server listening on port ${port}`);
  });

  return server;
}

module.exports = {
  startBootstrapServer,
  BOOTSTRAP_PORT
};