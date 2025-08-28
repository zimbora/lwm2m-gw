const { 
  startTimeoutManager, 
  stopTimeoutManager, 
  checkClientTimeouts, 
  OFFLINE_TIMEOUT, 
  CHECK_INTERVAL 
} = require('../../server/timeoutManager');

const { 
  registerClient, 
  getClient, 
  listClients,
  deregisterClient 
} = require('../../server/clientRegistry');

const sharedEmitter = require('../../server/transport/sharedEmitter');

describe('Timeout Manager', () => {
  beforeEach(() => {
    // Clear all clients before each test
    const clients = listClients();
    clients.forEach(client => deregisterClient(client.ep));
    stopTimeoutManager(); // Ensure no timeout manager is running
  });

  afterEach(() => {
    stopTimeoutManager();
  });

  test('should start and stop timeout manager', () => {
    const interval = startTimeoutManager();
    expect(interval).toBeDefined();
    
    // Stop and verify it's cleaned up
    stopTimeoutManager();
  });

  test('should mark clients offline after 60s', (done) => {
    const ep = 'test-client-offline';
    
    // Register a client with old lastActivity
    const oldTime = Date.now() - (OFFLINE_TIMEOUT + 1000); // 61s ago
    registerClient(ep, {
      address: '127.0.0.1',
      port: 5683,
      location: '/rd/001',
      lifetime: 300,
      binding: 'U'
    });
    
    // Manually set old lastActivity (simulate old activity)
    const client = getClient(ep);
    client.lastActivity = oldTime;
    
    let offlineEventReceived = false;
    
    // Listen for offline event
    sharedEmitter.once('client_offline', ({ ep: offlineEp }) => {
      expect(offlineEp).toBe(ep);
      offlineEventReceived = true;
      
      // Verify client is marked as offline
      const updatedClient = getClient(ep);
      expect(updatedClient.offline).toBe(true);
      
      done();
    });
    
    // Run timeout check
    checkClientTimeouts();
    
    // If no event was received, the test should still complete
    setTimeout(() => {
      if (!offlineEventReceived) {
        done(new Error('Client offline event was not emitted'));
      }
    }, 100);
  });

  test('should deregister clients after lifetime expires', (done) => {
    const ep = 'test-client-lifetime';
    
    // Register a client with short lifetime
    const shortLifetime = 1; // 1 second
    registerClient(ep, {
      address: '127.0.0.1',
      port: 5683,
      location: '/rd/002',
      lifetime: shortLifetime,
      binding: 'U'
    });
    
    // Set lastActivity to be older than lifetime
    const client = getClient(ep);
    client.lastActivity = Date.now() - (shortLifetime * 1000 + 1000); // 2s ago
    
    let deregisterEventReceived = false;
    
    // Listen for deregistration event
    sharedEmitter.once('deregistration', ({ ep: deregEp, reason }) => {
      expect(deregEp).toBe(ep);
      expect(reason).toBe('lifetime_expired');
      deregisterEventReceived = true;
      
      // Verify client is removed
      const removedClient = getClient(ep);
      expect(removedClient).toBeUndefined();
      
      done();
    });
    
    // Run timeout check
    checkClientTimeouts();
    
    // If no event was received, the test should still complete
    setTimeout(() => {
      if (!deregisterEventReceived) {
        done(new Error('Client deregistration event was not emitted'));
      }
    }, 100);
  });

  test('should not affect clients with recent activity', () => {
    const ep = 'test-client-active';
    
    // Register a client with recent activity
    registerClient(ep, {
      address: '127.0.0.1',
      port: 5683,
      location: '/rd/003',
      lifetime: 300,
      binding: 'U'
    });
    
    // Run timeout check
    checkClientTimeouts();
    
    // Verify client is still active
    const client = getClient(ep);
    expect(client).toBeDefined();
    expect(client.offline).toBe(false);
  });

  test('should have correct timeout constants', () => {
    expect(OFFLINE_TIMEOUT).toBe(60 * 1000); // 60 seconds
    expect(CHECK_INTERVAL).toBe(30 * 1000);  // 30 seconds
  });
});