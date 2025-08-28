// test/client/routes.test.js
global.$ = {};
$.logger = require('../../client/logger.js');
$.protocol = 'coap';

// Mock transport functions
const mockSendNotification = jest.fn();
const mockStopObservation = jest.fn();

jest.mock('../../client/transport/coapServer', () => ({
  sendNotification: mockSendNotification,
  stopObservation: mockStopObservation
}));

const {
  handleDiscoveryRequest,
  handleGetRequest,
  handlePutRequest,
  handlePostRequest,
  handleDeleteRequest,
  handleCreateRequest,
  handleProvisionCompleted
} = require('../../client/routes');

const CONTENT_FORMATS = require('../../utils/contentFormats');

describe('Client Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDiscoveryRequest', () => {
    test('should generate discovery response with link format', () => {
      const mockRes = {
        setOption: jest.fn(),
        end: jest.fn(),
        code: null
      };

      handleDiscoveryRequest(mockRes);

      expect(mockRes.setOption).toHaveBeenCalledWith('Content-Format', 'application/link-format');
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith(expect.any(String));
      
      const links = mockRes.end.mock.calls[0][0];
      expect(links).toContain('</3/0/0>');
      expect(links).toContain('title="Manufacturer"');
      expect(links).toContain('readable');
    });
  });

  describe('handlePostRequest', () => {
    test('should execute resource function and return success', () => {
      const mockExecute = jest.fn();
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        execute: mockExecute
      };

      handlePostRequest({}, mockRes, { resource: mockResource });

      expect(mockExecute).toHaveBeenCalled();
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should return method not allowed for non-executable resource', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        // no execute function
      };

      handlePostRequest({}, mockRes, { resource: mockResource });

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should return method not allowed for null resource', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };

      handlePostRequest({}, mockRes, { resource: null });

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('handleDeleteRequest', () => {
    test('should delete all resource values when no resourceId specified', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        0: { value: 'value1' },
        1: { value: 'value2' }
      };

      handleDeleteRequest({}, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: null, 
        resource: mockResource 
      });

      expect(mockResource[0].value).toBeNull();
      expect(mockResource[1].value).toBeNull();
      expect(mockRes.code).toBe('2.02');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should return error for invalid resource', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };

      handleDeleteRequest({}, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: 0, 
        resource: null 
      });

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Object or resource not valid');
    });
  });

  describe('handleCreateRequest', () => {
    test('should handle invalid object ID', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockReq = {
        headers: { 'Content-Format': CONTENT_FORMATS.cbor },
        payload: Buffer.from([])
      };

      handleCreateRequest(mockReq, mockRes, { objectId: 9999, newInstanceId: 1 });

      expect(mockRes.code).toBe('5.04');
      expect(mockRes.end).toHaveBeenCalledWith(`Object not available or couldn't create a new instance`);
    });
  });

  describe('handleProvisionCompleted', () => {
    beforeEach(() => {
      $.client = {};
    });

    test('should set provisioned flag and return success', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };

      handleProvisionCompleted({}, mockRes);

      expect($.client.provisioned).toBe(true);
      expect(mockRes.code).toBe('2.01');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('handlePutRequest', () => {
    test('should reject write for non-writable resource', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        writable: false
      };

      handlePutRequest({}, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: 0, 
        resource: mockResource 
      });

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Write not allowed');
    });

    test('should handle plain text payload', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        writable: true,
        type: 'string'
      };
      const mockReq = {
        headers: {},
        payload: Buffer.from('test-value')
      };
      const observers = {};

      handlePutRequest(mockReq, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: 0, 
        resource: mockResource,
        observers: observers,
        path: '3/0/0'
      });

      expect(mockResource.value).toBe('test-value');
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should handle numeric payload', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        writable: true,
        type: 'integer'
      };
      const mockReq = {
        headers: {},
        payload: Buffer.from('42')
      };
      const observers = {};

      handlePutRequest(mockReq, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: 0, 
        resource: mockResource,
        observers: observers,
        path: '3/0/0'
      });

      expect(mockResource.value).toBe(42);
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should send notification to observers after write', () => {
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        writable: true,
        type: 'string'
      };
      const mockReq = {
        headers: {},
        payload: Buffer.from('new-value')
      };
      const mockObserver = {
        address: '127.0.0.1',
        port: 5683,
        token: Buffer.from([1, 2, 3, 4])
      };
      const observers = {
        '3/0/0': [mockObserver]
      };

      handlePutRequest(mockReq, mockRes, { 
        objectId: 3, 
        instanceId: 0, 
        resourceId: 0, 
        resource: mockResource,
        observers: observers,
        path: '3/0/0'
      });

      expect(mockSendNotification).toHaveBeenCalledWith(mockObserver, '3/0/0', 'new-value');
      expect(mockRes.code).toBe('2.04');
    });
  });

  describe('handleGetRequest observation', () => {
    test('should start observation for observable resource', () => {
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn(),
        setToken: jest.fn(),
        token: Buffer.from([1, 2, 3, 4])
      };
      const mockReq = {
        headers: { Observe: '0' },
        rsinfo: { address: '127.0.0.1' },
        _packet: { token: Buffer.from([1, 2, 3, 4]) }
      };
      const mockResource = {
        readable: true,
        observable: true,
        value: 'test-value'
      };
      const observers = {};

      handleGetRequest(mockReq, mockRes, {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: observers,
        path: '3/0/0'
      });

      expect(mockRes.setOption).toHaveBeenCalledWith('Observe', 0);
      expect(mockRes.setToken).toHaveBeenCalledWith(Buffer.from([1, 2, 3, 4]));
      expect(mockRes.end).toHaveBeenCalledWith('test-value');
      expect(observers['3/0/0']).toBeDefined();
      expect(observers['3/0/0'][0].address).toBe('127.0.0.1');
    });

    test('should stop observation', () => {
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockReq = {
        headers: { Observe: '1' },
        rsinfo: { address: '127.0.0.1' },
        _packet: { token: Buffer.from([1, 2, 3, 4]) }
      };
      const mockResource = {
        readable: true,
        observable: true,
        value: 'test-value'
      };
      const observers = {
        '3/0/0': [{ address: '127.0.0.1', port: 5683, token: Buffer.from([1, 2, 3, 4]) }]
      };

      handleGetRequest(mockReq, mockRes, {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: observers,
        path: '3/0/0'
      });

      expect(mockStopObservation).toHaveBeenCalledWith(mockResource);
      expect(mockRes.setOption).toHaveBeenCalledWith('Observe', 1);
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith('Observation stopped');
      expect(observers['3/0/0']).toBeUndefined();
    });
  });
});