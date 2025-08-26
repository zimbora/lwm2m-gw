// test/server/transport.test.js
const coap = require('coap');

// Mock coap module
jest.mock('coap', () => ({
  Agent: jest.fn().mockImplementation(() => ({ type: 'udp4' })),
  request: jest.fn()
}));

const { sendCoapRequest } = require('../../server/transport/coapClient');

describe('Server Transport', () => {
  
  describe('CoAP Client', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should validate client input', async () => {
      await expect(sendCoapRequest(null, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
      await expect(sendCoapRequest({}, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
    });

    test('should create request with proper options', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '127.0.0.1', port: 5683 };
      
      // Don't await this as it will hang without proper mock response
      const requestPromise = sendCoapRequest(client, 'GET', '/test/path', null, 'ep=test', {});
      
      expect(coap.request).toHaveBeenCalledWith({
        hostname: '127.0.0.1',
        port: 5683,
        method: 'GET',
        pathname: '/test/path',
        token: null,
        confirmable: true,
        observe: undefined,
        query: 'ep=test',
        agent: expect.any(Object)
      });

      expect(mockReq.end).toHaveBeenCalled();
      
      // Clean up the hanging promise
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });

    test('should handle observe options', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '127.0.0.1' };
      
      // Test observe request
      const requestPromise = sendCoapRequest(client, 'GET', '/test', null, '', { observe: 0 });
      
      const callArgs = coap.request.mock.calls[0][0];
      expect(callArgs.observe).toBe(0);
      expect(callArgs.token).toBeTruthy(); // Should have a token for observe
      expect(callArgs.port).toBe(5683); // Default port
      
      // Clean up
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });

    test('should set content format when specified', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn(),
        write: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '127.0.0.1' };
      const payload = Buffer.from('test payload');
      
      const requestPromise = sendCoapRequest(client, 'POST', '/test', payload, '', { format: 'application/json' });
      
      expect(mockReq.setOption).toHaveBeenCalledWith('Content-Format', 'application/json');
      expect(mockReq.write).toHaveBeenCalledWith(payload);
      
      // Clean up
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });

    test('should handle non-confirmable requests', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '127.0.0.1' };
      
      const requestPromise = sendCoapRequest(client, 'GET', '/test', null, '', { confirmable: false });
      
      const callArgs = coap.request.mock.calls[0][0];
      expect(callArgs.confirmable).toBe(false);
      
      // Clean up
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });

    test('should use custom port when provided', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '192.168.1.100', port: 5684 };
      
      const requestPromise = sendCoapRequest(client, 'GET', '/test');
      
      const callArgs = coap.request.mock.calls[0][0];
      expect(callArgs.hostname).toBe('192.168.1.100');
      expect(callArgs.port).toBe(5684);
      
      // Clean up
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });

    test('should handle string payload', async () => {
      const mockReq = {
        setOption: jest.fn(),
        on: jest.fn(),
        end: jest.fn(),
        write: jest.fn()
      };
      
      coap.request.mockReturnValue(mockReq);

      const client = { address: '127.0.0.1' };
      
      const requestPromise = sendCoapRequest(client, 'PUT', '/test', 'string payload');
      
      expect(mockReq.write).toHaveBeenCalledWith('string payload');
      
      // Clean up
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Test cleanup')), 10);
        }
      });
    });
  });

  describe('MQTT Client', () => {
    test('should be importable without errors', () => {
      expect(() => {
        require('../../server/transport/mqttClient');
      }).not.toThrow();
    });
  });

  describe('DTLS Client', () => {
    test('should be importable without errors', () => {
      expect(() => {
        require('../../server/transport/coapClientDTLS');
      }).not.toThrow();
    });
  });
});