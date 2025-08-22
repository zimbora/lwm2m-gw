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
    handler = new MqttRequestHandler({
      enabled: false, // Don't actually connect during tests
      project: 'test',
      host: 'localhost',
      port: 1883
    });
  });

  afterEach(() => {
    if (handler) {
      handler.disconnect();
    }
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
      
      expect(getRequest).toHaveBeenCalledWith('device1', '/3/0/0');
      expect(result).toBe('test-response');
    });

    test('should route PUT request', async () => {
      putRequest.mockResolvedValue('put-response');
      
      const result = await handler.routeRequest('device1', 'PUT', '/3/0/1', 'new-value', {});
      
      expect(putRequest).toHaveBeenCalledWith('device1', '/3/0/1', 'new-value');
      expect(result).toBe('put-response');
    });

    test('should route POST request', async () => {
      postRequest.mockResolvedValue('post-response');
      
      const result = await handler.routeRequest('device1', 'POST', '/3/0/4', null, {});
      
      expect(postRequest).toHaveBeenCalledWith('device1', '/3/0/4', null);
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
      
      expect(startObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700');
      expect(result).toBe('observe-response');
    });

    test('should route CANCEL-OBSERVE request', async () => {
      stopObserveRequest.mockResolvedValue('cancel-observe-response');
      
      const result = await handler.routeRequest('device1', 'CANCEL-OBSERVE', '/3303/0/5700', null, {});
      
      expect(stopObserveRequest).toHaveBeenCalledWith('device1', '/3303/0/5700');
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

  describe('configuration', () => {
    test('should use default configuration', () => {
      const defaultHandler = new MqttRequestHandler();
      expect(defaultHandler.config.project).toBe('lwm2m');
      expect(defaultHandler.config.host).toBe('localhost');
      expect(defaultHandler.config.port).toBe(1883);
      expect(defaultHandler.config.enabled).toBe(true);
    });

    test('should override configuration', () => {
      const customHandler = new MqttRequestHandler({
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
});