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

global.$ = {};

const { server } = require('../../index');

const { 
  startLwM2MCoapServer,
  startLwM2MMqttServer,
  discoveryRequest,
  getRequest,
  startObserveRequest,
  stopObserveRequest,
  putRequest,
  postRequest,
  deleteRequest,
  createRequest,
  startLwM2MDTLSCoapServer
} = server.resourceClient;

const sharedEmitter = server.sharedEmitter;

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

async function getInfo(clientEp) {
  // Delay to wait for client registration

  setTimeout(async () => {
    const client = clientEp;
    //console.log(`sending requests to client: ${client}`)

    try{
      /*
      // Read
      await discoveryRequest(clientEp)
      */
    
      await getRequest(clientEp,'/3/0/0')

      await getRequest(clientEp,'/3303/0/5601')

      // Observe timestamp
      await startObserveRequest(clientEp,'/6/0/7');

      // Observe Temperature
      await startObserveRequest(clientEp,'/3303/0/5700');

      setTimeout(() => putRequest(clientEp,'/3303/0/5601', "-30.0"), 2000);

      setTimeout(() => getRequest(clientEp,'/3303/0/5601'), 3000);
      
    }catch(error){
      console.error(error);
    }
    // Execute
    //setTimeout(() => sendCoapRequest(client, 'POST', '/3/0/2'), 9000);
  }, 2000);

  setTimeout(() => {
    const client = clientEp;
    try{
      getRequest(clientEp,'/3303/0/5601');
    }catch(error){
      console.error(error);
    }
  }, 10000);
}

// Listen for registration events
sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(`[Event] Client registered via ${protocol}: ${ep} at ${location}`);
  getInfo(ep);
});

// Listen for update events
sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[Event] Client updated via ${protocol}: ${ep} at ${location}`);
});

// Listen for deregistration events
sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[Event] Client deregistered via ${protocol}: ${ep}`);
});

sharedEmitter.on('observation', ({ protocol, ep, token, method, path, payload }) => {
  
  console.log(`[Event] Data received via: ${ep}/${method}${path}`);
  console.log(`[Event] payload: ${payload}`);
});

sharedEmitter.on('response', ({ protocol, ep, method, path, payload, options, error }) => {
  //console.log(options)
  if(path == "/.well-known/core"){
    
  }else{
    console.log(`[Event] Client response ${protocol}: ${ep}/${method}${path}`);
    if(payload != null)
      console.log(`[Event] Client payload ${payload}`);
  }

});

sharedEmitter.on('error', (error) => {
  console.error(error);
});

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
