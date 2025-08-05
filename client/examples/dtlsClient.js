#!/usr/bin/env node

// client/examples/dtlsClient.js - DTLS-enabled LwM2M Client
global.$ = {};
$.logger = require('../logger.js');

$.client = {};
$.client['registered'] = false;

const { startDtlsResourceServer } = require('../dtlsResourceServer');
const { registerToServer, updateRegistration, deregister } = require('../registration');

const endpointName = 'node-dtls-client-001';
const serverHost = 'localhost';
const serverPort = 5684; // Different port for DTLS server
const localPort = 56831; // Different local port for DTLS client

const RETRY_INTERVAL = 10000; // Every 10s
let updateTimer = null;

(async () => {
  try {
    // Start DTLS resource server
    $.logger.info('[DTLS Client] Starting DTLS resource server...');
    startDtlsResourceServer(localPort);
    $.logger.info('[DTLS Client] DTLS resource server started');

    // For now, we'll just start the DTLS server without trying to register
    // since we would need a DTLS-enabled LwM2M server to register with
    $.logger.info('[DTLS Client] DTLS client is running and ready to accept secure connections');
    $.logger.info(`[DTLS Client] Listening on port ${localPort} for DTLS connections`);
    
    // Note: To complete the registration, we would need to implement DTLS client-side
    // communication to connect to a DTLS-enabled LwM2M server
    $.logger.info('[DTLS Client] To test: Use a DTLS-enabled CoAP client to connect to this server');

  } catch (error) {
    $.logger.error(`[DTLS Client] Error: ${error.message}`);
    process.exit(1);
  }
})();

async function monitorServerConnection() {
  updateTimer = setInterval(async () => {
    if (!$.client.registered) return;

    try {
      await updateRegistration(serverHost, serverPort);
    } catch (error) {
      $.logger.error(`[DTLS Client] Update failed: ${error.message}`);
      // Attempt re-registration
      try {
        await registerToServer(endpointName, serverHost, serverPort, localPort);
        $.client.registered = true;
      } catch (regError) {
        $.logger.error(`[DTLS Client] Re-registration failed: ${regError.message}`);
        $.client.registered = false;
      }
    }
  }, RETRY_INTERVAL);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  $.logger.info('[DTLS Client] Shutting down...');
  
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  if ($.client.registered) {
    try {
      await deregister(serverHost, serverPort);
      $.logger.info('[DTLS Client] Successfully deregistered');
    } catch (error) {
      $.logger.error(`[DTLS Client] Deregistration error: ${error.message}`);
    }
  }

  process.exit(0);
});