#!/usr/bin/env node

/**
 * Example usage of the DTLS CoAP Server
 * 
 * This demonstrates how to start a secure LwM2M server using DTLS encryption.
 * Before running this example, you need to generate SSL certificates:
 * 
 * openssl ecparam -name secp256r1 -genkey -noout -out ecdsa.key
 * openssl req -x509 -new -key ecdsa.key -out ecdsa.crt -days 365 -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost
 * 
 * OR
 *  
 * openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes \
 *   -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"
 * 
 * !! rsa:2048 alg not tested
 */ 

const path = require('path');
const { startLwM2MDTLSCoapServer } = require('../resourceClient');

// Validation function for client registration
const validation = (ep, payload) => {
  console.log(`[DTLS Example] Validating client registration for endpoint: ${ep}`);
  // In a real application, implement your validation logic here
  return Promise.resolve(true);
};

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

try {
  console.log('[DTLS Example] Starting DTLS-enabled LwM2M server...');
  
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
    port: 5684,
    key: path.join(__dirname, '../key.pem'),
    //key: fs.readFileSync('../key.pem'),
    identityPskCallback: identityPskCallback,
    debug: 0,
    handshakeTimeoutMin: 3000
  };

  let server = null;
  try {
    server = startLwM2MDTLSCoapServer(validation, dtlsOptions);
  } catch (error) {
    console.error('[DTLS Example] Error starting server:', error.message);
    process.exit(1);
  }
  
  console.log('[DTLS Example] Server started successfully!');
  console.log(`[DTLS Example] Clients can connect using CoAPS (DTLS) on port ${dtlsOptions.port}`);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[DTLS Example] Shutting down server...');
    if (server && server.close) {
      server.close();
    }
    process.exit(0);
  });
  
} catch (err) {
  console.error('[DTLS Example] Failed to start server:', err.message);
  
  if (err.message.includes('not found')) {
    console.error('\n[DTLS Example] Certificate files are missing.');
    console.error('[DTLS Example] Generate them with:');
    console.error('>> openssl ecparam -name secp256r1 -genkey -noout -out ecdsa.key');
    console.error('and then:');
    console.error('>> openssl req -x509 -new -key ecdsa.key -out ecdsa.crt -days 365 \\');
    console.error('  -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"');
  }
  
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[DTLS Example] Shutting down gracefully...');
  server.close(() => {
    console.log('[DTLS Example] Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[DTLS Example] Unhandled Promise Rejection:', reason);
});