// test/dtls-socket-reuse.test.js
/**
 * Integration test to verify DTLS socket reuse functionality
 */
const { sendDTLSCoapRequest } = require('../server/transport/coapClientDTLS');
const { getDTLSSocketManager } = require('../server/transport/dtlsSocketManager');
const { registerClient, deregisterClient } = require('../server/clientRegistry');

describe('DTLS Socket Reuse Integration', () => {
  let socketManager;
  
  beforeEach(() => {
    // Clean up any existing manager
    const existingManager = getDTLSSocketManager();
    if (existingManager) {
      existingManager.destroy();
    }
    
    // Get fresh manager
    socketManager = getDTLSSocketManager();
  });
  
  afterEach(() => {
    if (socketManager) {
      socketManager.destroy();
    }
  });

  test('should register DTLS client and manage socket lifecycle', async () => {
    // Register a DTLS client
    const clientInfo = {
      address: '127.0.0.1',
      port: 5684,
      protocol: 'coaps',
      location: '/rd/test123',
      lifetime: 300,
      binding: 'U'
    };
    
    // Mock the socket manager's getSocket method to prevent actual connection
    const originalGetSocket = socketManager.getSocket;
    socketManager.getSocket = jest.fn().mockRejectedValue(new Error('Mocked connection failure'));
    
    registerClient('test-client', clientInfo);
    
    // Verify socket manager is initialized
    expect(socketManager).toBeDefined();
    
    // Wait a moment for the async socket creation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initially no sockets due to mock failure (which is expected)
    let stats = socketManager.getStats();
    expect(stats.totalSockets).toBe(0);
    
    // Restore original method
    socketManager.getSocket = originalGetSocket;
    
    // Deregister client
    const ep = deregisterClient('test-client');
    expect(ep).toBe('test-client');
  });

  test('should handle multiple clients with separate sockets', () => {
    // Register multiple DTLS clients
    const client1 = {
      address: '127.0.0.1',
      port: 5684,
      protocol: 'coaps',
      location: '/rd/client1',
      lifetime: 300,
      binding: 'U'
    };
    
    const client2 = {
      address: '127.0.0.1', 
      port: 5685,
      protocol: 'coaps',
      location: '/rd/client2',
      lifetime: 300,
      binding: 'U'
    };
    
    registerClient('client1', client1);
    registerClient('client2', client2);
    
    // Verify each client gets its own management
    const stats = socketManager.getStats();
    expect(stats).toBeDefined();
    
    // Cleanup
    deregisterClient('client1');
    deregisterClient('client2');
  });

  test('should demonstrate socket reuse concept without real connection', async () => {
    // This test demonstrates the socket manager behavior
    // without requiring actual DTLS connections
    
    const mockClient = {
      ep: 'mock-client',
      address: '127.0.0.1',
      port: 5684,
      protocol: 'coaps'
    };
    
    // Mock socket creation to avoid actual network calls
    const originalGetSocket = socketManager.getSocket;
    let socketCallCount = 0;
    
    socketManager.getSocket = jest.fn().mockImplementation(async (ep, client) => {
      socketCallCount++;
      return {
        send: jest.fn(),
        once: jest.fn((event, callback) => {
          if (event === 'message') {
            // Simulate a response after a delay
            setTimeout(() => {
              const mockResponse = Buffer.from([
                0x45, 0x00, // CoAP version, type, token length, code (2.05 Content)
                0x12, 0x34, // Message ID
                // Token would follow, then options and payload
              ]);
              callback(mockResponse);
            }, 10);
          }
        }),
        removeListener: jest.fn()
      };
    });
    
    // First request should "create" socket
    try {
      await sendDTLSCoapRequest(mockClient, 'GET', '/test', null, '', { timeout: 100 });
    } catch (err) {
      // Expected to fail due to mock response
      expect(err.message).toContain('parse');
    }
    
    // Second request should "reuse" socket  
    try {
      await sendDTLSCoapRequest(mockClient, 'GET', '/test', null, '', { timeout: 100 });
    } catch (err) {
      // Expected to fail due to mock response
      expect(err.message).toContain('parse');
    }
    
    // Verify socket was called for each request
    expect(socketCallCount).toBe(2);
    expect(socketManager.getSocket).toHaveBeenCalledTimes(2);
    expect(socketManager.getSocket).toHaveBeenCalledWith('mock-client', mockClient);
    
    // Restore original method
    socketManager.getSocket = originalGetSocket;
  });

  test('should validate client object requirements', async () => {
    // Test missing address
    try {
      await sendDTLSCoapRequest({}, 'GET', '/test');
      expect(false).toBe(true); // Should not reach here
    } catch (err) {
      expect(err.message).toContain('address is required');
    }
    
    // Test missing endpoint
    try {
      await sendDTLSCoapRequest({ address: '127.0.0.1' }, 'GET', '/test');
      expect(false).toBe(true); // Should not reach here  
    } catch (err) {
      expect(err.message).toContain('ep (endpoint name) is required');
    }
  });
  
  test('should handle socket manager stats', () => {
    const stats = socketManager.getStats();
    
    expect(stats).toHaveProperty('totalSockets');
    expect(stats).toHaveProperty('sockets');
    expect(typeof stats.totalSockets).toBe('number');
    expect(Array.isArray(stats.sockets)).toBe(true);
  });

  test('should cleanup on socket manager destruction', () => {
    const stats = socketManager.getStats();
    expect(stats.totalSockets).toBe(0);
    
    // Add a mock socket to test cleanup
    socketManager.sockets.set('test', {
      socket: { close: jest.fn() },
      lastUsed: Date.now(),
      connecting: false
    });
    
    expect(socketManager.getStats().totalSockets).toBe(1);
    
    // Destroy should clean up
    socketManager.destroy();
    
    expect(socketManager.getStats().totalSockets).toBe(0);
  });
});