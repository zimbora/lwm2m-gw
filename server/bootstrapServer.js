#!/usr/bin/env node

// server/bootstrapServer.js - Standalone Bootstrap Server
const { startBootstrapServer } = require('./bootstrap');
const { setBootstrapConfiguration } = require('./handleBootstrap');

console.log('Starting LwM2M Bootstrap Server...');

// Example: Set custom bootstrap configuration for specific clients
setBootstrapConfiguration('node-client-001', {
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

// Start the bootstrap server
const server = startBootstrapServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Bootstrap] Shutting down gracefully...');
  server.close(() => {
    console.log('[Bootstrap] Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Bootstrap] Unhandled Promise Rejection:', reason);
});

console.log('[Bootstrap] Server is ready. Clients can send bootstrap requests to /bs');
console.log('[Bootstrap] Use client with bootstrap enabled to test the functionality');