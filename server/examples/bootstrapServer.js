#!/usr/bin/env node

global.$ = {};

// server/bootstrapServer.js - Standalone Bootstrap Server
const { server } = require('../../index');
const { setBootstrapConfiguration } = require('../handleBootstrap');

console.log('Starting LwM2M Bootstrap Server...');

// Example: Set custom bootstrap configuration for specific clients
setBootstrapConfiguration('node-client-bootstrap-001', {
  securityInstances: [
    {
      instanceId: 0,
      serverUri: 'coap://localhost:5683',
      isBootstrap: false,
      securityMode: 3, // NoSec
      shortServerId: 123
    }
  ],
  serverInstances: [
    {
      instanceId: 0,
      shortServerId: 123,
      lifetime: 600, // 10 minutes
      binding: 'U',
      notificationStoring: true
    }
  ]
});

async function bootstrapDeviceCallback({query, ep}){
  console.log(`[Bootstrap Server] Get bootstrap config for ep: ${ep}`);
  // using this callback to get info from a 3rd party
  let config = {
    securityInstances: [
      {
        instanceId: 0,
        serverUri: 'coap://localhost:5683',
        isBootstrap: false,
        securityMode: 3, // NoSec
        shortServerId: 123
      }
    ],
    serverInstances: [
      {
        instanceId: 0,
        shortServerId: 123,
        lifetime: 600, // 10 minutes
        binding: 'U',
        notificationStoring: true
      }
    ]
  }
  return config;
}

// Start the bootstrap server
const bootstrapServer = server.bootstrap.startBootstrapServer(bootstrapDeviceCallback);

server.sharedEmitter.on('bootstrap-request', ({protocol, ep}) => {
  console.log(`[Bootstrap Server] Bootstrap request from: ${ep}`);
});

server.sharedEmitter.on('error',  ({protocol, ep}) => {  
  console.log(`[Bootstrap Server] Bootstrap finished for: ${ep}`);
});

server.sharedEmitter.on('error', (error) => {
  console.log(error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Bootstrap] Shutting down gracefully...');
  bootstrapServer.close(() => {
    console.log('[Bootstrap] Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Bootstrap] Unhandled Promise Rejection:', reason);
});

console.log('[Bootstrap] Server is ready. Clients can send bootstrap requests to /bs');
console.log('[Bootstrap] Use client with bootstrap enabled to test the functionality');