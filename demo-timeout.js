#!/usr/bin/env node

// Simple demonstration of the timeout functionality
const path = require('path');
const { listClients } = require('./server/clientRegistry');
const { startLwM2MCoapServer } = require('./server/resourceClient');

// Start the server
console.log('Starting LwM2M Server...');
startLwM2MCoapServer();

// Monitor clients periodically
setInterval(() => {
  const clients = listClients();
  if (clients.length > 0) {
    console.log('\n=== Current Clients ===');
    clients.forEach(client => {
      const timeSinceActivity = Date.now() - client.lastActivity;
      const timeSinceRegistration = Date.now() - client.registeredAt;
      console.log(`Client: ${client.ep}`);
      console.log(`  - Protocol: ${client.protocol}`);
      console.log(`  - Lifetime: ${client.lifetime}s`);
      console.log(`  - Offline: ${client.offline}`);
      console.log(`  - Time since activity: ${Math.round(timeSinceActivity / 1000)}s`);
      console.log(`  - Time since registration: ${Math.round(timeSinceRegistration / 1000)}s`);
      console.log('');
    });
  } else {
    console.log('\n=== No clients registered ===');
  }
}, 10000); // Check every 10 seconds

console.log('\nServer is running on port 5683');
console.log('You can register a client and watch the timeout behavior:');
console.log('- Clients will be marked offline after 60s of inactivity');
console.log('- Clients will be deregistered after their lifetime expires (default: 1 day)');
console.log('- Press Ctrl+C to stop\n');