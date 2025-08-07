#!/usr/bin/env node

// client/examples/dtlsClient.js - DTLS-enabled LwM2M Client
global.$ = {};
$.logger = require('../logger.js');

$.client = {};
$.client['registered'] = false;

const { startDtlsResourceServer } = require('../dtlsResourceServer');

const endpointName = 'node-dtls-client-001';
const localPort = 56831; // DTLS server port

(async () => {
  try {
    // Start DTLS resource server
    $.logger.info('[DTLS Client] Starting DTLS resource server...');
    /*
    const dtlsOptions = {
      // Use default certificate for testing
      // In production, you would use proper certificates
      debug: 5, // Set to higher values for more debug output
      handshakeTimeoutMin: 3000,
      //psk : "mySharedPrivateKey"
    };
    */
    const dtlsOptions = {
      debug: 5, // Set to higher values for more debug output
      keyPath: './certTests/server-key.pem',   // Path to RSA private key
      certPath: './certTests/server-cert.pem',  // Path to X.509 certificate
    };

    startDtlsResourceServer(localPort, dtlsOptions);
    $.logger.info('[DTLS Client] DTLS resource server started');

    $.logger.info('[DTLS Client] DTLS client is running and ready to accept secure connections');
    $.logger.info(`[DTLS Client] Listening on port ${localPort} for DTLS connections`);
    
    // Display information about testing
    $.logger.info('[DTLS Client] Testing instructions:');
    $.logger.info('[DTLS Client] 1. Use a DTLS-enabled CoAP client to connect to this server');
    $.logger.info('[DTLS Client] 2. Example command with libcoap:');
    $.logger.info(`[DTLS Client]    coap-client -m GET -k path/to/key coaps://localhost:${localPort}/3/0/0`);
    $.logger.info('[DTLS Client] 3. The server will accept DTLS handshakes and process CoAP/LwM2M requests');
    $.logger.info('[DTLS Client] 4. Available LwM2M resources include:');
    $.logger.info('[DTLS Client]    - /3/0/0 (Device Object - Manufacturer)');
    $.logger.info('[DTLS Client]    - /3303/0/5700 (Temperature Sensor - Sensor Value)');
    $.logger.info('[DTLS Client]    - /.well-known/core (Resource Discovery)');

  } catch (error) {
    $.logger.error(`[DTLS Client] Error: ${error.message}`);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  $.logger.info('[DTLS Client] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  $.logger.info('[DTLS Client] Shutting down...');
  process.exit(0);
});