// test/setup.js
// Global test setup file

// Mock node-mbed-dtls module since it requires native compilation
jest.mock('node-mbed-dtls', () => ({
  createServer: jest.fn().mockReturnValue({
    on: jest.fn(),
    listen: jest.fn()
  })
}));

// Suppress console output during tests unless explicitly needed
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Clean up timers after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock CoAP request
  createMockCoapRequest: (responseCode = '2.05', payload = 'test') => ({
    setOption: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'response') {
        setTimeout(() => callback({
          code: responseCode,
          payload: Buffer.from(payload),
          headers: {}
        }), 10);
      }
    })
  }),
  
  // Helper to create mock resource
  createMockResource: (overrides = {}) => ({
    value: 'test-value',
    readable: true,
    writable: false,
    observable: false,
    executable: false,
    ...overrides
  }),
  
  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};