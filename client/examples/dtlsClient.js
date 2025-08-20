#!/usr/bin/env node

// client/examples/dtlsClient.js - DTLS-enabled LwM2M Client
global.$ = {};
$.logger = require('../logger.js');

$.client = {};
$.client['registered'] = false;
$.protocol = 'coaps'
const { dtls } = require('node-dtls-client');

const path = require('path');
const { startDtlsResourceServer } = require('../dtlsResourceServer');
const { registerToServer, updateRegistration, deregister } = require('../registration');

const protocol = 'coaps';
const serverHost = 'localhost';
const serverPort = 5684; // DTLS server port
const endpointName = 'node-dtls-client-001';
const localPort = 56831; // DTLS server port


const RETRY_INTERVAL = 60*1000; // Every minute
let updateTimer = null;

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

    

    // Create DTLS socket once
    $.client.socket = dtls.createSocket({
      type: 'udp4',
      address: 'localhost',
      port: 5684,
      psk: { "Client_identity": "secret" }
    });

    $.client.socket.on('connected', async () => {
      console.log('DTLS connected');

      try{
        await registerToServer(endpointName, serverHost, serverPort, localPort, 300, protocol); // Register to remote LwM2M server
        $.client.registered = true;

        monitorServerConnection(); // Start periodic update checks

        /*
        setTimeout(async()=>{
          try{
            if($.client.registered)
              await deregister(serverHost, serverPort, 300, protocol); // Register to remote LwM2M server

            $.client.registered = false;
          }catch(error){
            $.logger.error(error)
          }
        },5000);
        */

      }catch(error){
        $.logger.error(error)
      }

      /*        
      // Send first request
      sendDTLSCoapRequest(socket, { pathname: 'sensor/temp', method: 'GET' }, (err, res) => {
        if (err) return console.error(err);
        console.log('Temp:', res);

        // Send second request on the same connection
        sendDTLSCoapRequest(socket, { pathname: 'sensor/humidity', method: 'GET' }, (err, res) => {
          if (err) return console.error(err);
          console.log('Humidity:', res);

          socket.close();
        });
      });
      */
    }); 

    $.client.socket.on('close',()=>{
      sys.exit(1);
    });

    $.client.socket.on('error',(error)=>{
      console.log(error);
      sys.exit(1);
    });
    
  } catch (error) {
    $.logger.error(`[DTLS Client] Error: ${error.message}`);
    process.exit(1);
  }
})();

async function monitorServerConnection() {
  
  updateTimer = setInterval(async () => {
    if (!$.client.registered){
      try {
          $.logger.info('[DTLS Client] Attempting re-registration...');
          await registerToServer(endpointName, serverHost, serverPort, localPort, 300, protocol);
          $.client.registered = true;
          monitorServerConnection(); // restart updates
        } catch (regErr) {
          $.logger.error(`[DTLS Client] Re-registration failed: ${regErr.message}`);
        }
        return;
    }else{
      try {
        $.logger.info('[DTLS Client] Updating registration...');
        await updateRegistration(serverHost, serverPort, 300, protocol);
        $.logger.debug('[DTLS Client] Sent registration update.');
      } catch (err) {
        $.logger.error(`[DTLS Client] Lost connection to server during update: ${err.message}`);
        $.client.registered = false;

        $.logger.info('[DTLS Client] Attempting re-registration...');
        try {
          await registerToServer(endpointName, serverHost, serverPort, localPort, 300, protocol);
          $.client.registered = true;
        } catch (regErr) {
          $.logger.error(`[DTLS Client] Re-registration failed: ${regErr.message}`);
        } 
      }
    }

  }, RETRY_INTERVAL);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  $.logger.info('[DTLS Client] Shutting down...');
  
  // Close the DTLS socket if it exists
  if ($.client.socket) {
    try {
      $.client.socket.close();
      $.logger.info('[DTLS Client] Closed DTLS socket');
    } catch (err) {
      $.logger.error('[DTLS Client] Error closing DTLS socket:', err.message);
    }
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  $.logger.info('[DTLS Client] Shutting down...');
  
  // Close the DTLS socket if it exists
  if ($.client.socket) {
    try {
      $.client.socket.close();
      $.logger.info('[DTLS Client] Closed DTLS socket');
    } catch (err) {
      $.logger.error('[DTLS Client] Error closing DTLS socket:', err.message);
    }
  }
  
  process.exit(0);
});