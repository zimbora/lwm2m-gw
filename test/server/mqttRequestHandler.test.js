// test/server/mqttRequestHandler.test.js

const MqttRequestHandler = require('../../server/mqttRequestHandler');

// Mock the LwM2M functions
jest.mock('../../server/resourceClient', () => ({
  discoveryRequest: jest.fn(),
  getRequest: jest.fn(),
  putRequest: jest.fn(),
  postRequest: jest.fn(),
  deleteRequest: jest.fn(),
  startObserveRequest: jest.fn(),
  stopObserveRequest: jest.fn(),
}));

describe('MqttRequestHandler', () => {
  let handler;
  
  beforeEach(() => {
    const mockClient = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn()
    };
    handler = new MqttRequestHandler(mockClient, {
      enabled: false, // Don't actually connect during tests
      project: 'test',
      host: 'localhost',
      port: 1883
    });
  });

  afterEach(() => {
    // Clean up any mock state
    jest.clearAllMocks();
  });

  describe('parseRequest', () => {
    test('should parse GET request correctly', () => {
      const result = handler.parseRequest('GET/3/0/0', '{}');
      expect(result.method).toBe('GET');
      expect(result.path).toBe('/3/0/0');
      expect(result.payload).toBe(null);
    });

    test('should parse PUT request with payload', () => {
      const message = JSON.stringify({ payload: 'test-value' });
      const result = handler.parseRequest('PUT/3/0/1', message);
      expect(result.method).toBe('PUT');
      expect(result.path).toBe('/3/0/1');
      expect(result.payload).toBe('test-value');
    });

    test('should parse OBSERVE request', () => {
      const result = handler.parseRequest('OBSERVE/3303/0/5700', '{}');
      expect(result.method).toBe('OBSERVE');
      expect(result.path).toBe('/3303/0/5700');
    });

    test('should handle plain text payload', () => {
      const result = handler.parseRequest('PUT/3/0/1', 'plain-text-value');
      expect(result.method).toBe('PUT');
      expect(result.path).toBe('/3/0/1');
      expect(result.payload).toBe('plain-text-value');
    });

    test('should handle complex paths', () => {
      const result = handler.parseRequest('GET/3303/0/5700', '{}');
      expect(result.method).toBe('GET');
      expect(result.path).toBe('/3303/0/5700');
    });

    test('should parse JSON message with format options', () => {
      const message = JSON.stringify({ 
        payload: 'test-value',
        options: { format: 'json' }
      });
      const result = handler.parseRequest('PUT/3/0/1', message);
      expect(result.method).toBe('PUT');
      expect(result.path).toBe('/3/0/1');
      expect(result.payload).toBe('test-value');
      expect(result.options.format).toBe('json');
    });

    test('should handle empty options object', () => {
      const message = JSON.stringify({ payload: 'test-value', options: {} });
      const result = handler.parseRequest('PUT/3/0/1', message);
      expect(result.options).toEqual({});
    });
  });

  describe('routeRequest', () => {
    const { 
      getRequest, 
      putRequest, 
      postRequest, 
      deleteRequest, 
      discoveryRequest,
      startObserveRequest,
      stopObserveRequest 
    } = require('../../server/resourceClient');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should route GET request', async () => {
      getRequest.mockResolvedValue('test-response');
      
      const result = await handler.routeRequest('device1', 'GET', '/3/0/0', null, {});
      
      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0', 'text');
      expect(result).toBe('test-response');
    });

    test('should route PUT request', async () => {
      putRequest.mockResolvedValue('put-response');
      
      const result = await handler.routeRequest('device1', 'PUT', '/3/0/1', 'new-value', {});
      
      expect(putRequest).toHaveBeenCalledWith('device1', '/3/0/1', 'new-value', 'text');
      expect(result).toBe('put-response');
    });

    test('should route POST request', async () => {
      postRequest.mockResolvedValue('post-response');
      
      const result = await handler.routeRequest('device1', 'POST', '/3/0/4', null, {});
      
      expect(postRequest).toHaveBeenCalledWith('device1', '/3/0/4', null, 'text');
      expect(result).toBe('post-response');
    });

    test('should route DELETE request', async () => {
      deleteRequest.mockResolvedValue('delete-response');
      
      const result = await handler.routeRequest('device1', 'DELETE', '/3/1', null, {});
      
      expect(deleteRequest).toHaveBeenCalledWith('device1', '/3/1');
      expect(result).toBe('delete-response');
    });

    test('should route DISCOVER request', async () => {
      discoveryRequest.mockResolvedValue('discover-response');
      
      const result = await handler.routeRequest('device1', 'DISCOVER', '/', null, {});
      
      expect(discoveryRequest).toHaveBeenCalledWith('device1');
      expect(result).toBe('discover-response');
    });

    test('should route OBSERVE request', async () => {
      startObserveRequest.mockResolvedValue('observe-response');
      
      const result = await handler.routeRequest('device1', 'OBSERVE', '/3303/0/5700', null, {});
      
      expect(startObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700', 0, 'text');
      expect(result).toBe('observe-response');
    });

    test('should route CANCEL-OBSERVE request', async () => {
      stopObserveRequest.mockResolvedValue('cancel-observe-response');
      
      const result = await handler.routeRequest('device1', 'CANCEL-OBSERVE', '/3303/0/5700', null, {});
      
      expect(stopObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700', 1, 'text');
      expect(result).toBe('cancel-observe-response');
    });

    test('should throw error for unsupported method', async () => {
      await expect(
        handler.routeRequest('device1', 'INVALID', '/3/0/0', null, {})
      ).rejects.toThrow('Unsupported method: INVALID');
    });

    test('should throw error for PUT without payload', async () => {
      await expect(
        handler.routeRequest('device1', 'PUT', '/3/0/1', null, {})
      ).rejects.toThrow('PUT request requires payload');
    });
  });

  describe('format handling', () => {
    const { 
      getRequest, 
      putRequest, 
      postRequest,
      startObserveRequest,
      stopObserveRequest 
    } = require('../../server/resourceClient');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should pass format option to GET request', async () => {
      getRequest.mockResolvedValue('test-response');
      
      const result = await handler.routeRequest('device1', 'GET', '/3/0/0', null, { format: 'json' });
      
      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0', 'json');
      expect(result).toBe('test-response');
    });

    test('should use default format if not specified', async () => {
      getRequest.mockResolvedValue('test-response');
      
      const result = await handler.routeRequest('device1', 'GET', '/3/0/0', null, {});
      
      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0', 'text');
      expect(result).toBe('test-response');
    });

    test('should pass format option to PUT request', async () => {
      putRequest.mockResolvedValue('put-response');
      
      const result = await handler.routeRequest('device1', 'PUT', '/3/0/1', 'new-value', { format: 'cbor' });
      
      expect(putRequest).toHaveBeenCalledWith('device1', '/3/0/1', 'new-value', 'cbor');
      expect(result).toBe('put-response');
    });

    test('should pass format option to POST request', async () => {
      postRequest.mockResolvedValue('post-response');
      
      const result = await handler.routeRequest('device1', 'POST', '/3/0/4', 'execute-param', { format: 'tlv' });
      
      expect(postRequest).toHaveBeenCalledWith('device1', '/3/0/4', 'execute-param', 'tlv');
      expect(result).toBe('post-response');
    });

    test('should pass format option to OBSERVE request', async () => {
      startObserveRequest.mockResolvedValue('observe-response');
      
      const result = await handler.routeRequest('device1', 'OBSERVE', '/3303/0/5700', null, { format: 'json' });
      
      expect(startObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700', 0, 'json');
      expect(result).toBe('observe-response');
    });

    test('should pass format option to CANCEL-OBSERVE request', async () => {
      stopObserveRequest.mockResolvedValue('cancel-observe-response');
      
      const result = await handler.routeRequest('device1', 'CANCEL-OBSERVE', '/3303/0/5700', null, { format: 'cbor' });
      
      expect(stopObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700', 1, 'cbor');
      expect(result).toBe('cancel-observe-response');
    });
  });

  describe('configuration', () => {
    test('should use default configuration', () => {
      const mockClient = { publish: jest.fn(), subscribe: jest.fn(), on: jest.fn() };
      const defaultHandler = new MqttRequestHandler(mockClient, {});
      expect(defaultHandler.config.project).toBe('lwm2m');
      expect(defaultHandler.config.enabled).toBe(true);
    });

    test('should override configuration', () => {
      const mockClient = { publish: jest.fn(), subscribe: jest.fn(), on: jest.fn() };
      const customHandler = new MqttRequestHandler(mockClient, {
        project: 'custom',
        host: 'custom-host',
        port: 8883,
        enabled: false
      });
      
      expect(customHandler.config.project).toBe('custom');
      expect(customHandler.config.host).toBe('custom-host');
      expect(customHandler.config.port).toBe(8883);
      expect(customHandler.config.enabled).toBe(false);
    });
  });

  describe('handleIncomingRequest integration', () => {
    const { getRequest, putRequest } = require('../../server/resourceClient');
    let mockClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockClient = {
        publish: jest.fn(),
        subscribe: jest.fn(),
        on: jest.fn()
      };
      handler = new MqttRequestHandler(mockClient, {
        project: 'lwm2m',
        enabled: true
      });
    });

    test('should handle GET request with format option', async () => {
      getRequest.mockResolvedValue('test-response');
      
      const topic = 'lwm2m/requests/device1/GET/3/0/0';
      const message = Buffer.from(JSON.stringify({
        options: { format: 'json' }
      }));

      await handler.handleIncomingRequest(topic, message);

      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0', 'json');
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/GET/3/0/0',
        expect.stringContaining('"endpoint":"device1"'),
        { qos: 1 }
      );
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/GET/3/0/0',
        expect.stringContaining('"method":"GET"'),
        { qos: 1 }
      );
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/GET/3/0/0',
        expect.stringContaining('"path":"/3/0/0"'),
        { qos: 1 }
      );
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/GET/3/0/0',
        expect.stringContaining('"data":"test-response"'),
        { qos: 1 }
      );
    });

    test('should handle PUT request with format option', async () => {
      putRequest.mockResolvedValue('put-response');
      
      const topic = 'lwm2m/requests/device1/PUT/3/0/1';
      const message = Buffer.from(JSON.stringify({
        payload: 'test-value',
        options: { format: 'cbor' }
      }));

      await handler.handleIncomingRequest(topic, message);

      expect(putRequest).toHaveBeenCalledWith('device1', '/3/0/1', 'test-value', 'cbor');
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/PUT/3/0/1',
        expect.stringContaining('"endpoint":"device1"'),
        { qos: 1 }
      );
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/PUT/3/0/1',
        expect.stringContaining('"method":"PUT"'),
        { qos: 1 }
      );
      expect(mockClient.publish).toHaveBeenCalledWith(
        'lwm2m/responses/device1/PUT/3/0/1',
        expect.stringContaining('"data":"put-response"'),
        { qos: 1 }
      );
    });

    test('should use default format when no format option provided', async () => {
      getRequest.mockResolvedValue('test-response');
      
      const topic = 'lwm2m/requests/device1/GET/3/0/0';
      const message = Buffer.from('{}');

      await handler.handleIncomingRequest(topic, message);

      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0', 'text');
    });
  });
});