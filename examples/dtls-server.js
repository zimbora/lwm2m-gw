#!/usr/bin/env node

/**
 * Example usage of the DTLS CoAP Server
 * 
 * This demonstrates how to start a secure LwM2M server using DTLS encryption.
 * Before running this example, you need to generate SSL certificates:
 * 
 * openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes \
 *   -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"
 */

const { startLwM2MDTLSCoapServer } = require('../server/resourceClient');

// Validation function for client registration
const validation = (ep, payload) => {
  console.log(`[DTLS Example] Validating client registration for endpoint: ${ep}`);
  // In a real application, implement your validation logic here
  return Promise.resolve(true);
};

// DTLS server options
const options = {
  port: 5684,           // Standard CoAPS (DTLS) port
  keyPath: './server.key',   // Path to RSA private key
  certPath: './server.crt',  // Path to X.509 certificate
};

try {
  console.log('[DTLS Example] Starting DTLS-enabled LwM2M server...');
  
  const server = startLwM2MDTLSCoapServer(validation, options);
  
  console.log('[DTLS Example] Server started successfully!');
  console.log('[DTLS Example] Clients can connect using CoAPS (DTLS) on port 5684');
  
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
    console.error('openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes \\');
    console.error('  -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"');
  }
  
  process.exit(1);
}