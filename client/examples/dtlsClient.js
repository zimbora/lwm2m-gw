#!/usr/bin/env node

// client/examples/dtlsClient.js - DTLS-enabled LwM2M Client
global.$ = {};
$.logger = require('../logger.js');

$.client = {};
$.client['registered'] = false;

const path = require('path');
const { startDtlsResourceServer } = require('../dtlsResourceServer');
const { registerToServer, updateRegistration, deregister } = require('../registration');

const serverHost = 'localhost';
const serverPort = 5684; // DTLS server port
const endpointName = 'node-dtls-client-001';
const localPort = 56831; // DTLS server port

/**
 * @param {Buffer} identity
 * @param {Buffer} sessionId
 * @returns {string}
 */
function identityPskCallback(identity, sessionId) {
  let psk = '';

  console.log('[DTLS Example] identity received: ', identity.toString('utf8'));

  switch (identity.toString('utf8'))  {
    case 'Client_identity':
      psk = 'secret';
      break;
    case '32323232-3232-3232-3232-323232323232':
      psk = 'AAAAAAAAAAAAAAAA';
      break;
    default:
      psk = 'q2w3e4r5t6';
      break;
  }

  console.log('[DTLS Example] pre-shared key found');

  return psk;
}

(async () => {
  try {
    // Start DTLS resource server
    $.logger.info('[DTLS Client] Starting DTLS resource server...');

    /*
    !! To be tested with ECDSA certs
    const dtlsOptions = {
      debug: 1,
      type: 'client',
      port: 5684,
      address: 'localhost',
      psk: null, // no PSK if using certs
      key: path.join('../../certTests/server-key.pem'),
      cert: path.join('../../certTests/server-cert.pem'),
      ca: [path.join('../../certTests/ca-cert.pem')],
      
      cipherSuites: [
        'TLS-ECDHE-ECDSA-WITH-AES-128-CCM-8' // Required for ECDSA support
      ],
  
      requestCert: true,
      rejectUnauthorized: true, // verify server cert
      handshakeTimeoutMin: 1000,
      handshakeTimeoutMax: 60000
    };
  
    */
    const dtlsOptions = {
      port: localPort,
      key: path.join(__dirname, '../key.pem'),
      //key: fs.readFileSync('../key.pem'),
      identityPskCallback: identityPskCallback,
      debug: 0,
      handshakeTimeoutMin: 3000
    };

    startDtlsResourceServer(localPort, dtlsOptions);
    $.logger.info('[DTLS Client] DTLS resource server started');

    $.logger.info('[DTLS Client] DTLS client is running and ready to accept secure connections');
    $.logger.info(`[DTLS Client] Listening on port ${localPort} for DTLS connections`);
    
    // Display information about testing
    $.logger.info('[DTLS Client] Testing instructions:');
    $.logger.info('[DTLS Client] 1. Use a DTLS-enabled CoAP client to connect to this server');
    $.logger.info('[DTLS Client] 2. Example command with libcoap:');
    $.logger.info(`[DTLS Client]    coap-client -m GET -k q2w3e4r5t6 coaps://localhost:${localPort}/3/0/0`);

    try{
      await registerToServer(endpointName, serverHost, serverPort, localPort); // Register to remote LwM2M server

      $.client.registered = true;
    }catch(error){
      $.logger.error(error)
    }
    
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