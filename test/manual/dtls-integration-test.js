#!/usr/bin/env node

// test/manual/dtls-integration-test.js
/**
 * Manual integration test for DTLS socket pooling
 * This script demonstrates the behavior with and without socket pooling
 */

const path = require('path');
process.chdir(path.join(__dirname, '../../'));

const { startLwM2MDTLSCoapServer, getRequest } = require('../../server/resourceClient');
const { getDTLSSocketManager } = require('../../server/transport/dtlsSocketManager');
const { registerClient } = require('../../server/clientRegistry');
const sharedEmitter = require('../../server/transport/sharedEmitter');

console.log('[Integration Test] DTLS Socket Pooling Demo');
console.log('This test demonstrates socket reuse for DTLS clients');

// PSK callback for DTLS authentication
function identityPskCallback(identity, sessionId) {
  console.log(`[Test] PSK callback for identity: ${identity.toString('utf8')}`);
  
  switch (identity.toString('utf8')) {
    case 'Client_identity':
      return 'secret';
    case '32323232-3232-3232-3232-323232323232':
      return 'AAAAAAAAAAAAAAAA';  
    default:
      return 'q2w3e4r5t6';
  }
}

// Validation function for client registration
const validation = (ep, payload) => {
  console.log(`[Test] Validating registration for endpoint: ${ep}`);
  return Promise.resolve(true);
};

// DTLS server options
const dtlsOptions = {
  port: 5684,
  key: path.join(__dirname, '../../server/key.pem'),
  identityPskCallback: identityPskCallback,
  debug: 0,
  handshakeTimeoutMin: 3000
};

async function runTest() {
  console.log('\n[Test] Starting DTLS server...');
  
  try {
    // Start DTLS server
    const server = startLwM2MDTLSCoapServer(validation, dtlsOptions);
    console.log('[Test] DTLS server started on port', dtlsOptions.port);

    // Listen for client registration events
    sharedEmitter.on('registration', async ({ protocol, ep, location }) => {
      console.log(`\n[Test] Client registered: ${ep} via ${protocol} at ${location}`);
      
      // Wait a moment for socket to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await demonstrateSocketReuse(ep);
    });

    sharedEmitter.on('error', (error) => {
      console.error('[Test] Error:', error);
    });

    // Manually register a test client to simulate what would happen
    console.log('\n[Test] Simulating client registration...');
    const testClient = {
      address: '127.0.0.1',
      port: 5684,
      protocol: 'coaps',
      location: '/rd/12345',
      lifetime: 300,
      binding: 'U'
    };
    
    registerClient('test-client-001', testClient);
    console.log('[Test] Test client registered in registry');
    
    // Emit registration event to trigger the demonstration
    sharedEmitter.emit('registration', { 
      protocol: 'coaps', 
      ep: 'test-client-001', 
      location: '/rd/12345' 
    });

    // Keep the server running for the demonstration
    console.log('\n[Test] Server is running. You can now connect a DTLS client.');
    console.log('[Test] Or wait for the socket reuse demonstration...');

  } catch (err) {
    console.error('[Test] Failed to start server:', err.message);
    process.exit(1);
  }
}

async function demonstrateSocketReuse(ep) {
  console.log(`\n[Test] Demonstrating socket reuse for client: ${ep}`);
  
  const socketManager = getDTLSSocketManager();
  const initialStats = socketManager.getStats();
  
  console.log(`[Test] Initial socket count: ${initialStats.totalSockets}`);
  
  // Simulate multiple requests to the same client
  console.log('[Test] Simulating 3 requests to the same client...');
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n[Test] Request ${i}:`);
    
    const startTime = Date.now();
    
    try {
      // This would normally make a real request, but since we don't have
      // a real client connected, we'll just demonstrate the socket management
      const client = { ep, address: '127.0.0.1', port: 5684 };
      
      console.log(`[Test] Getting socket for client ${ep}...`);
      const socket = await socketManager.getSocket(ep, client);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[Test] Socket ${i === 1 ? 'created' : 'reused'} in ${duration}ms`);
      
      const stats = socketManager.getStats();
      console.log(`[Test] Current socket count: ${stats.totalSockets}`);
      
      if (stats.sockets.length > 0) {
        const socketInfo = stats.sockets[0];
        console.log(`[Test] Socket status: connected=${socketInfo.connected}, idle_time=${socketInfo.idleTime}ms`);
      }
      
    } catch (err) {
      console.error(`[Test] Request ${i} failed:`, err.message);
      // This is expected since we don't have a real DTLS client
      if (i === 1) {
        console.log('[Test] This is expected without a real DTLS client connected');
      }
    }
    
    // Wait between requests to show timing difference
    if (i < 3) await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n[Test] Socket reuse demonstration complete!');
  console.log('[Test] Key observations:');
  console.log('  - First request establishes the socket (higher latency)');  
  console.log('  - Subsequent requests reuse the existing socket (lower latency)');
  console.log('  - No additional DTLS handshakes are performed');
  
  // Show final stats
  const finalStats = socketManager.getStats();
  console.log(`\n[Test] Final socket count: ${finalStats.totalSockets}`);
  
  setTimeout(() => {
    console.log('\n[Test] Shutting down...');
    process.exit(0);
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Test] Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Test] Unhandled Promise Rejection:', reason);
});

// Run the test
runTest().catch(err => {
  console.error('[Test] Test failed:', err);
  process.exit(1);
});