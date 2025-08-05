// test/client/bootstrap-comprehensive.test.js
const { 
  requestBootstrap, 
  sendBootstrapFinish, 
  waitForProvisioning, 
  performBootstrap 
} = require('../../client/bootstrap');
const coap = require('coap');

// Mock the global $ object and logger
global.$ = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  client: {
    provisioned: false
  }
};

// Mock coap module
jest.mock('coap');

describe('Bootstrap Client - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    $.client.provisioned = false;
  });

  describe('requestBootstrap', () => {
    test('should send bootstrap request with correct parameters', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      const result = await requestBootstrap('test-client', 'localhost', 5684, 5683);

      expect(coap.request).toHaveBeenCalledWith({
        hostname: 'localhost',
        port: 5684,
        pathname: '/bs',
        method: 'POST',
        query: 'ep=test-client&port=5683',
        agent: expect.any(Object)
      });

      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Bootstrap request accepted');
    });

    test('should reject on non-2.04 response', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ 
              code: '4.00', 
              payload: Buffer.from('Bad Request') 
            }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await expect(requestBootstrap('test-client', 'localhost'))
        .rejects.toThrow('Bootstrap failed: 4.00 Bad Request');
    });

    test('should timeout if no response received', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          // Don't simulate any response
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      // Mock setInterval to trigger timeout immediately
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn((callback, delay) => {
        setTimeout(callback, 10);
        return originalSetInterval(callback, delay);
      });

      await expect(requestBootstrap('test-client', 'localhost'))
        .rejects.toThrow('No response from bootstrap server');

      global.setInterval = originalSetInterval;
    });

    test('should handle request errors', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Network error')), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await expect(requestBootstrap('test-client', 'localhost'))
        .rejects.toThrow('Network error');
    });
  });

  describe('sendBootstrapFinish', () => {
    test('should send bootstrap finish with correct parameters', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await sendBootstrapFinish('test-client', 'localhost', 5684);

      expect(coap.request).toHaveBeenCalledWith({
        hostname: 'localhost',
        port: 5684,
        pathname: '/bs-finish',
        method: 'POST',
        query: 'ep=test-client',
        agent: expect.any(Object)
      });

      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Bootstrap finish acknowledged');
    });

    test('should reject on non-2.04 response for finish', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ 
              code: '4.04',
              payload: Buffer.from('Not Found')
            }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await expect(sendBootstrapFinish('test-client', 'localhost'))
        .rejects.toThrow('Bootstrap finish failed: 4.04 Not Found');
    });
  });

  describe('waitForProvisioning', () => {
    test('should resolve when client is provisioned', async () => {
      // Mock setInterval and setTimeout
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        // Simulate provisioning completion after first check
        setTimeout(() => {
          $.client.provisioned = true;
          callback();
        }, 50);
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        return originalSetTimeout(callback, delay);
      });

      const result = await waitForProvisioning(1000);
      
      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Provisioning completed');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });

    test('should timeout if provisioning takes too long', async () => {
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        if (delay === 100) { // Our test timeout
          setTimeout(callback, 50);
        }
        return originalSetTimeout(callback, delay);
      });

      await expect(waitForProvisioning(100))
        .rejects.toThrow('Bootstrap provisioning timeout');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });

    test('should use fallback timeout for provisioning', async () => {
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      let fallbackCalled = false;
      
      global.setInterval = jest.fn((callback, delay) => {
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        if (delay === 15000) { // Fallback timeout
          setTimeout(() => {
            fallbackCalled = true;
            callback();
          }, 50);
        }
        return originalSetTimeout(callback, delay);
      });

      const result = await waitForProvisioning(20000);
      
      expect(fallbackCalled).toBe(true);
      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Provisioning completed (timeout fallback)');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('performBootstrap', () => {
    test('should complete full bootstrap sequence', async () => {
      // Mock all CoAP requests
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      // Mock provisioning completion
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        setTimeout(() => {
          $.client.provisioned = true;
          callback();
        }, 20);
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        return originalSetTimeout(callback, delay);
      });

      const result = await performBootstrap('test-client', 'localhost', 5684, 5683);

      expect(result).toBe(true);
      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Starting bootstrap sequence for test-client');
      expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Bootstrap sequence completed successfully');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });

    test('should handle bootstrap request failure', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ 
              code: '4.00',
              payload: Buffer.from('Bad Request')
            }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await expect(performBootstrap('test-client', 'localhost'))
        .rejects.toThrow('Bootstrap failed: 4.00 Bad Request');

      expect($.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[Bootstrap Client] Bootstrap sequence failed:')
      );
    });

    test('should handle provisioning timeout failure', async () => {
      // Mock successful bootstrap request
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      // Mock provisioning timeout
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        if (delay === 10000) { // Our test timeout
          setTimeout(callback, 50);
        }
        return originalSetTimeout(callback, delay);
      });

      await expect(performBootstrap('test-client', 'localhost'))
        .rejects.toThrow('Bootstrap provisioning timeout');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });

    test('should handle bootstrap finish failure', async () => {
      let requestCount = 0;
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            requestCount++;
            if (requestCount === 1) {
              // First request (bootstrap) succeeds
              setTimeout(() => callback({ code: '2.04' }), 10);
            } else {
              // Second request (finish) fails
              setTimeout(() => callback({ 
                code: '4.04',
                payload: Buffer.from('Not Found')
              }), 10);
            }
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      // Mock fast provisioning
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        setTimeout(() => {
          $.client.provisioned = true;
          callback();
        }, 20);
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        return originalSetTimeout(callback, delay);
      });

      await expect(performBootstrap('test-client', 'localhost'))
        .rejects.toThrow('Bootstrap finish failed: 4.04 Not Found');

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Bootstrap Client Edge Cases', () => {
    test('should handle empty endpoint name', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await requestBootstrap('', 'localhost');

      expect(coap.request).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'ep=&port=5683'
        })
      );
    });

    test('should use default ports when not specified', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await requestBootstrap('test-client', 'localhost');

      expect(coap.request).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 5684, // Default bootstrap port
          query: 'ep=test-client&port=5683' // Default local port
        })
      );
    });

    test('should handle custom ports', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            setTimeout(() => callback({ code: '2.04' }), 10);
          }
        }),
        end: jest.fn()
      };

      coap.request.mockReturnValue(mockRequest);
      coap.Agent = jest.fn();

      await requestBootstrap('test-client', 'localhost', 7777, 8888);

      expect(coap.request).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 7777, // Custom bootstrap port
          query: 'ep=test-client&port=8888' // Custom local port
        })
      );
    });
  });
});