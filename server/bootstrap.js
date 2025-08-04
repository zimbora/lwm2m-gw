// server/bootstrap.js
const coap = require('coap');
const { handleBootstrapRequest, handleBootstrapFinish } = require('./handleBootstrap');
const sharedEmitter = require('./transport/sharedEmitter');

const BOOTSTRAP_PORT = 5684; // Standard LwM2M Bootstrap port

/**
 * LwM2M Bootstrap Server
 * 
 * Features:
 * - Provisioning Credentials: Supplies initial security credentials
 * - Device Configuration: Provides configuration parameters  
 * - Initial Registration: Facilitates initial registration process
 * - Security Management: Manages security object provisioning
 */

function startBootstrapServer(port = BOOTSTRAP_PORT) {
  const server = coap.createServer((req, res) => {
    const path = req?.url.split('?')[0];
    const method = req?.method;

    console.log(`[Bootstrap Server] ${method} ${path}`);

    if (method === 'POST' && path === '/bs') {
      // Handle bootstrap request
      handleBootstrapRequest(req, res)
        .then(({ ep }) => {
          console.log(`[Bootstrap Server] Bootstrap request from: ${ep}`);
          sharedEmitter.emit('bootstrap-request', { protocol: 'coap', ep });
        })
        .catch((err) => {
          console.error(`[Bootstrap Server] Bootstrap request error: ${err.message}`);
        });

    } else if (method === 'POST' && path === '/bs-finish') {
      // Handle bootstrap finish
      handleBootstrapFinish(req, res)
        .then(({ ep }) => {
          console.log(`[Bootstrap Server] Bootstrap finished for: ${ep}`);
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

// Listen for bootstrap events
sharedEmitter.on('bootstrap-request', ({ protocol, ep }) => {
  console.log(`[Bootstrap Event] Client ${ep} requested bootstrap via ${protocol}`);
});

sharedEmitter.on('bootstrap-finish', ({ protocol, ep }) => {
  console.log(`[Bootstrap Event] Client ${ep} finished bootstrap via ${protocol}`);
});

module.exports = {
  startBootstrapServer,
  BOOTSTRAP_PORT
};