global.$ = {};
$.logger = require('../logger.js');

// client/client.js
const { startResourceServer } = require('../resourceServer');
const {
  registerToServer,
  updateRegistration,
  deregister,
} = require('../registration');

const endpointName = 'node-client-001';
const serverHost = 'localhost';
const serverPort = 5683;
const localPort = 56830;

const RETRY_INTERVAL = 60 * 1000; // Every minute
let updateTimer = null;

$.client = {};
$.client['registered'] = false;

(async () => {
  startResourceServer(); // Start local CoAP server
  try {
    await registerToServer(endpointName, serverHost, serverPort, localPort); // Register to remote LwM2M server

    $.client.registered = true;
  } catch (error) {
    $.logger.error(error);
  }
})();

monitorServerConnection(); // Start periodic update checks

// Simulate deregister after 10s
/*
setTimeout(() => {
  deregister(serverHost, serverPort)
    .then(() => {
      $.client.registered = false;
      $.logger.info('[Client] Successfully deregistered');
    })
    .catch(err => {
      $.logger.error(`[Client] Deregister error: ${err}`);
    });
}, 10000);
*/

async function monitorServerConnection() {
  updateTimer = setInterval(async () => {
    if (!$.client.registered) {
      try {
        $.logger.info('[Client] Attempting re-registration...');
        await registerToServer(endpointName, serverHost, serverPort, localPort);
        $.client.registered = true;
        monitorServerConnection(); // restart updates
      } catch (regErr) {
        $.logger.error(`[Client] Re-registration failed: ${regErr.message}`);
      }
      return;
    } else {
      try {
        await updateRegistration(serverHost, serverPort);
        $.logger.debug('[Client] Sent registration update.');
      } catch (err) {
        $.logger.error(
          `[Client] Lost connection to server during update: ${err.message}`
        );
        $.client.registered = false;

        $.logger.info('[Client] Attempting re-registration...');
        try {
          await registerToServer(
            endpointName,
            serverHost,
            serverPort,
            localPort
          );
          $.client.registered = true;
        } catch (regErr) {
          $.logger.error(`[Client] Re-registration failed: ${regErr.message}`);
        }
      }
    }
  }, RETRY_INTERVAL);
}
