// test/dtls-socket-manager.test.js
const { DTLSSocketManager, getDTLSSocketManager, destroyDTLSSocketManager } = require('../server/transport/dtlsSocketManager');
const sharedEmitter = require('../server/transport/sharedEmitter');

describe('DTLS Socket Manager', () => {
  let socketManager;

  beforeEach(() => {
    destroyDTLSSocketManager(); // Clean up any existing manager
    socketManager = new DTLSSocketManager({ timeout: 30000 });
    
    // Mock shared emitter to avoid unhandled events
    sharedEmitter.removeAllListeners('error');
    sharedEmitter.on('error', (err) => {
      // Capture errors for testing
    });
  });

  afterEach(() => {
    if (socketManager) {
      socketManager.destroy();
    }
    destroyDTLSSocketManager();
    sharedEmitter.removeAllListeners('error');
  });

  test('should create singleton instance', () => {
    const manager1 = getDTLSSocketManager();
    const manager2 = getDTLSSocketManager();
    expect(manager1).toBe(manager2);
  });

  test('should initialize with default options', () => {
    const manager = new DTLSSocketManager();
    expect(manager.defaultTimeout).toBe(300000); // 5 minutes
    expect(manager.cleanupInterval).toBe(60000); // 1 minute
  });

  test('should track stats correctly', () => {
    const stats = socketManager.getStats();
    expect(stats.totalSockets).toBe(0);
    expect(Array.isArray(stats.sockets)).toBe(true);
  });

  test('should cleanup idle sockets', (done) => {
    // Mock a socket for testing cleanup
    const mockClient = { address: '127.0.0.1', port: 5684 };
    socketManager.sockets.set('test-client', {
      socket: { close: jest.fn() },
      lastUsed: Date.now() - 350000, // 5 minutes 50 seconds ago
      connecting: false
    });

    // Trigger cleanup
    socketManager.cleanupIdleSockets();
    
    setTimeout(() => {
      expect(socketManager.sockets.has('test-client')).toBe(false);
      done();
    }, 100);
  });

  test('should handle socket creation errors gracefully', async () => {
    const mockClient = { address: 'invalid-address', port: 5684 };
    
    try {
      await socketManager.getSocket('invalid-client', mockClient);
      expect(false).toBe(true); // Should not reach here
    } catch (err) {
      expect(err).toBeDefined();
      expect(socketManager.sockets.has('invalid-client')).toBe(false);
    }
  }, 15000); // Increase timeout for this test
});