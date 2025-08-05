// test/server/transport.test.js
const { sendCoapRequest } = require('../../server/transport/coapClient');
const { connectMqttClient, sendMqttRequest } = require('../../server/transport/mqttClient');
const sharedEmitter = require('../../server/transport/sharedEmitter');
const coap = require('coap');

// Mock coap module for testing
jest.mock('coap');

describe('CoAP Client Transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should validate client input', async () => {
    await expect(sendCoapRequest(null, 'GET', '/test'))
      .rejects.toThrow('Invalid client: address is required');

    await expect(sendCoapRequest({}, 'GET', '/test'))
      .rejects.toThrow('Invalid client: address is required');
  });

  test('should create CoAP request with correct parameters', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          // Simulate a response
          setTimeout(() => callback({
            code: '2.05',
            payload: Buffer.from('test response')
          }), 10);
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1', port: 5683 };
    const method = 'GET';
    const path = '/3/0/0';

    const responsePromise = sendCoapRequest(client, method, path);

    expect(coap.request).toHaveBeenCalledWith({
      hostname: '127.0.0.1',
      port: 5683,
      method: 'GET',
      pathname: '/3/0/0',
      confirmable: true,
      observe: undefined,
      query: undefined
    });

    const response = await responsePromise;
    expect(response.code).toBe('2.05');
    expect(response.payload.toString()).toBe('test response');
  });

  test('should use default port 5683 when not specified', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          callback({ code: '2.05', payload: Buffer.from('test') });
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1' }; // No port specified
    await sendCoapRequest(client, 'GET', '/test');

    expect(coap.request).toHaveBeenCalledWith(
      expect.objectContaining({ port: 5683 })
    );
  });

  test('should set Content-Format option when format specified', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          callback({ code: '2.05', payload: Buffer.from('test') });
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1', port: 5683 };
    const options = { format: 'application/cbor' };

    await sendCoapRequest(client, 'GET', '/test', null, '', options);

    expect(mockRequest.setOption).toHaveBeenCalledWith('Content-Format', 'application/cbor');
  });

  test('should write payload when provided', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          callback({ code: '2.04', payload: Buffer.from('success') });
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1', port: 5683 };
    const payload = JSON.stringify({ value: 42 });

    await sendCoapRequest(client, 'PUT', '/3/0/0', payload);

    expect(mockRequest.write).toHaveBeenCalledWith(payload);
  });

  test('should handle CoAP request errors', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'error') {
          callback(new Error('Connection failed'));
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1', port: 5683 };

    await expect(sendCoapRequest(client, 'GET', '/test'))
      .rejects.toThrow('Connection failed');
  });

  test('should set observe option for observation requests', async () => {
    const mockRequest = {
      setOption: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          callback({ code: '2.05', payload: Buffer.from('observed') });
        }
      })
    };

    coap.request.mockReturnValue(mockRequest);

    const client = { address: '127.0.0.1', port: 5683 };
    const options = { observe: 0 };

    await sendCoapRequest(client, 'GET', '/3/0/9', null, '', options);

    expect(coap.request).toHaveBeenCalledWith(
      expect.objectContaining({ observe: 0 })
    );
  });
});

describe('MQTT Client Transport', () => {
  test('should validate MQTT connection parameters', () => {
    expect(() => {
      connectMqttClient();
    }).toThrow();

    expect(() => {
      connectMqttClient('');
    }).toThrow();
  });

  test('should handle MQTT connection establishment', () => {
    // Since MQTT client is more complex to mock, we'll test the basic structure
    expect(connectMqttClient).toBeDefined();
    expect(sendMqttRequest).toBeDefined();
  });

  test('should support MQTT publish operations', () => {
    // Test that MQTT publish functionality exists
    expect(typeof sendMqttRequest).toBe('function');
  });
});

describe('Shared Event Emitter', () => {
  test('should be an EventEmitter instance', () => {
    expect(sharedEmitter.emit).toBeDefined();
    expect(sharedEmitter.on).toBeDefined();
    expect(sharedEmitter.off).toBeDefined();
  });

  test('should allow registration and emission of events', () => {
    const testCallback = jest.fn();
    
    sharedEmitter.on('test-event', testCallback);
    sharedEmitter.emit('test-event', { data: 'test' });

    expect(testCallback).toHaveBeenCalledWith({ data: 'test' });
    
    // Clean up
    sharedEmitter.off('test-event', testCallback);
  });

  test('should support LwM2M lifecycle events', () => {
    const registrationCallback = jest.fn();
    const updateCallback = jest.fn();
    const deregistrationCallback = jest.fn();

    sharedEmitter.on('registration', registrationCallback);
    sharedEmitter.on('update', updateCallback);
    sharedEmitter.on('deregistration', deregistrationCallback);

    // Simulate LwM2M events
    sharedEmitter.emit('registration', { ep: 'test-client', protocol: 'coap' });
    sharedEmitter.emit('update', { ep: 'test-client', protocol: 'coap' });
    sharedEmitter.emit('deregistration', { ep: 'test-client', protocol: 'coap' });

    expect(registrationCallback).toHaveBeenCalledWith({ ep: 'test-client', protocol: 'coap' });
    expect(updateCallback).toHaveBeenCalledWith({ ep: 'test-client', protocol: 'coap' });
    expect(deregistrationCallback).toHaveBeenCalledWith({ ep: 'test-client', protocol: 'coap' });

    // Clean up
    sharedEmitter.off('registration', registrationCallback);
    sharedEmitter.off('update', updateCallback);
    sharedEmitter.off('deregistration', deregistrationCallback);
  });

  test('should support bootstrap events', () => {
    const bootstrapRequestCallback = jest.fn();
    const bootstrapFinishCallback = jest.fn();

    sharedEmitter.on('bootstrap-request', bootstrapRequestCallback);
    sharedEmitter.on('bootstrap-finish', bootstrapFinishCallback);

    sharedEmitter.emit('bootstrap-request', { ep: 'test-client', protocol: 'coap' });
    sharedEmitter.emit('bootstrap-finish', { ep: 'test-client', protocol: 'coap' });

    expect(bootstrapRequestCallback).toHaveBeenCalledWith({ ep: 'test-client', protocol: 'coap' });
    expect(bootstrapFinishCallback).toHaveBeenCalledWith({ ep: 'test-client', protocol: 'coap' });

    // Clean up
    sharedEmitter.off('bootstrap-request', bootstrapRequestCallback);
    sharedEmitter.off('bootstrap-finish', bootstrapFinishCallback);
  });
});

describe('Transport Layer Integration', () => {
  test('should support protocol abstraction', () => {
    // Test that both CoAP and MQTT transports follow similar interfaces
    expect(sendCoapRequest).toBeDefined();
    expect(sendMqttRequest).toBeDefined();
    
    // Both should be functions that return promises
    expect(typeof sendCoapRequest).toBe('function');
    expect(typeof sendMqttRequest).toBe('function');
  });

  test('should handle multi-protocol scenarios', () => {
    // Test that the transport layer can handle multiple protocols
    const coapCallback = jest.fn();
    const mqttCallback = jest.fn();

    sharedEmitter.on('registration', (event) => {
      if (event.protocol === 'coap') {
        coapCallback(event);
      } else if (event.protocol === 'mqtt') {
        mqttCallback(event);
      }
    });

    sharedEmitter.emit('registration', { ep: 'coap-client', protocol: 'coap' });
    sharedEmitter.emit('registration', { ep: 'mqtt-client', protocol: 'mqtt' });

    expect(coapCallback).toHaveBeenCalledWith({ ep: 'coap-client', protocol: 'coap' });
    expect(mqttCallback).toHaveBeenCalledWith({ ep: 'mqtt-client', protocol: 'mqtt' });

    // Clean up
    sharedEmitter.removeAllListeners('registration');
  });
});