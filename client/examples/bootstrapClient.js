#!/usr/bin/env node

// client/bootstrapClient.js - Bootstrap-enabled LwM2M Client
global.$ = {};
$.logger = require('../logger.js');

$.client = {};
$.client['registered'] = false;
$.client['bootstrapped'] = false;
$.client['provisioned'] = false;

const { startResourceServer } = require('../resourceServer');
const { registerToServer } = require('../registration');
const { performBootstrap } = require('../bootstrap');

const endpointName = 'node-client-bootstrap-001';
const bootstrapHost = 'localhost';
const bootstrapPort = 5684;
const serverHost = 'localhost';
const serverPort = 5683;
const localPort = 56830;


/**
 * Bootstrap-enabled client flow:
 * 1. Start resource server
 * 2. Perform bootstrap sequence
 * 3. Register to main LwM2M server
 * 4. Maintain registration
 */
(async () => {
  try {
    // Step 1: Start local resource server
    startResourceServer();
    $.logger.info('[Bootstrap Client] Resource server started');

    // Step 2: Perform bootstrap sequence
    $.logger.info('[Bootstrap Client] Starting bootstrap sequence...');
    await performBootstrap(endpointName, bootstrapHost, bootstrapPort, localPort);
    $.client.bootstrapped = true;
    $.logger.info('[Bootstrap Client] Bootstrap completed successfully');

    // Step 3: Register to main LwM2M server
    $.logger.info('[Bootstrap Client] Registering to main LwM2M server...');
    await registerToServer(endpointName, serverHost, serverPort, localPort);
    $.client.registered = true;
    $.logger.info('[Bootstrap Client] Registration completed successfully');

    // Step 4: Start monitoring connection
    monitorServerConnection();

  } catch (error) {
    $.logger.error(`[Bootstrap Client] Initialization failed: ${error.message}`);
    process.exit(1);
  }
})();

/**
 * Monitor server connection and handle re-registration
 */
function monitorServerConnection() {
  const RETRY_INTERVAL = 30000; // Every 30 seconds
  
  setInterval(async () => {
    if (!$.client.registered) {
      try {
        $.logger.info('[Bootstrap Client] Attempting re-registration...');
        await registerToServer(endpointName, serverHost, serverPort, localPort);
        $.client.registered = true;
        $.logger.info('[Bootstrap Client] Re-registration successful');
      } catch (regErr) {
        $.logger.error(`[Bootstrap Client] Re-registration failed: ${regErr.message}`);
        
        // If registration fails, try bootstrap again
        if (!$.client.bootstrapped) {
          try {
            $.logger.info('[Bootstrap Client] Attempting re-bootstrap...');
            await performBootstrap(endpointName, bootstrapHost, bootstrapPort);
            $.client.bootstrapped = true;
            $.logger.info('[Bootstrap Client] Re-bootstrap successful');
          } catch (bootstrapErr) {
            $.logger.error(`[Bootstrap Client] Re-bootstrap failed: ${bootstrapErr.message}`);
          }
        }
      }
    }
  }, RETRY_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  $.logger.info('\n[Bootstrap Client] Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  $.logger.error('[Bootstrap Client] Unhandled Promise Rejection:', reason);
});

$.logger.info('[Bootstrap Client] Bootstrap-enabled client is running');
$.logger.info('[Bootstrap Client] Will bootstrap from server and then register to main LwM2M server');