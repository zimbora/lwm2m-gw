// test/client/routes.test.js
global.$ = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
};

const {
  handleDiscoveryRequest,
  handleGetRequest,
  handlePutRequest,
  handlePostRequest,
  handleDeleteRequest,
  handleCreateRequest,
  handleProvisionCompleted
} = require('../../client/routes');

const { getResource, getResourceSet } = require('../../client/objects');

describe('Client Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDiscoveryRequest', () => {
    test('should return link format response', () => {
      const mockRes = {
        setOption: jest.fn(),
        code: null,
        end: jest.fn()
      };

      handleDiscoveryRequest(mockRes);

      expect(mockRes.setOption).toHaveBeenCalledWith('Content-Format', 'application/link-format');
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('</'));
    });

    test('should include resource attributes in links', () => {
      const mockRes = {
        setOption: jest.fn(),
        code: null,
        end: jest.fn()
      };

      handleDiscoveryRequest(mockRes);

      const linksContent = mockRes.end.mock.calls[0][0];
      
      // Should contain object/instance/resource paths
      expect(linksContent).toMatch(/<\/\d+\/\d+\/\d+>/);
      
      // Should contain resource attributes
      expect(linksContent).toContain('readable');
      expect(linksContent).toContain('title=');
    });
  });

  describe('handleGetRequest', () => {
    test('should return resource value for readable resource', () => {
      const mockReq = {
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'test-value',
        readable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith('test-value');
    });

    test('should reject read for non-readable resource', () => {
      const mockReq = { headers: {} };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'test-value',
        readable: false
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Read not allowed');
    });

    test('should handle function-based resource values', () => {
      const mockReq = { headers: {} };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: () => 'dynamic-value',
        readable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith('dynamic-value');
    });

    test('should handle CBOR content format', () => {
      const mockReq = {
        headers: {
          Accept: 'application/cbor'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'test-value',
        readable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.setOption).toHaveBeenCalledWith('Content-Format', 'application/cbor');
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith(expect.any(Buffer));
    });

    test('should handle TLV content format', () => {
      const mockReq = {
        headers: {
          Accept: 'application/vnd.oma.lwm2m+tlv'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'test-value',
        readable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.setOption).toHaveBeenCalledWith('Content-Format', 'application/vnd.oma.lwm2m+tlv');
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith(expect.any(Buffer));
    });

    test('should reject observation for non-observable resource', () => {
      const mockReq = {
        headers: {
          observe: 0
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'test-value',
        readable: true,
        observable: false
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Observe not allowed');
    });

    test('should start observation for observable resource', () => {
      const mockReq = {
        headers: {
          observe: 0
        },
        rsinfo: {
          address: '127.0.0.1'
        },
        _packet: {
          token: Buffer.from([1, 2, 3, 4])
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'observable-value',
        readable: true,
        observable: true
      };
      const observers = {};
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers,
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.setOption).toHaveBeenCalledWith('Observe', 0);
      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith('observable-value');
      expect(observers['3/0/0']).toBeDefined();
      expect(observers['3/0/0']).toHaveLength(1);
    });

    test('should stop observation when observe value is not 0', () => {
      const mockReq = {
        headers: {
          observe: 1
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const mockResource = {
        value: 'observable-value',
        readable: true,
        observable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handleGetRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('2.05');
      expect(mockRes.end).toHaveBeenCalledWith('Observation stopped');
    });
  });

  describe('handlePutRequest', () => {
    test('should reject write for non-writable resource', () => {
      const mockReq = {
        payload: Buffer.from('new-value'),
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'old-value',
        writable: false
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handlePutRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Write not allowed');
    });

    test('should update writable resource with plain text', () => {
      const mockReq = {
        payload: Buffer.from('new-value'),
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'old-value',
        writable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      handlePutRequest(mockReq, mockRes, params);

      expect(mockResource.value).toBe('new-value');
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalledWith('Updated');
    });

    test('should handle CBOR content format', async () => {
      const mockReq = {
        payload: Buffer.from('mock-cbor-data'),
        headers: {
          'Content-Format': 'application/cbor'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'old-value',
        writable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      // Mock the PayloadCodec.decode to return a promise
      const originalDecode = require('../../utils/payloadCodec').decode;
      require('../../utils/payloadCodec').decode = jest.fn().mockResolvedValue({
        '0': 'decoded-value'
      });

      handlePutRequest(mockReq, mockRes, params);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Restore original function
      require('../../utils/payloadCodec').decode = originalDecode;
    });
  });

  describe('handlePostRequest', () => {
    test('should execute executable resource', () => {
      const mockExecute = jest.fn();
      const mockReq = {
        payload: Buffer.from(''),
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        execute: mockExecute,
        executable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 2,
        resource: mockResource
      };

      handlePostRequest(mockReq, mockRes, params);

      expect(mockExecute).toHaveBeenCalled();
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalledWith('Executed');
    });

    test('should reject execution for non-executable resource', () => {
      const mockReq = {
        payload: Buffer.from(''),
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'not-executable',
        executable: false
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource
      };

      handlePostRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Execute not allowed');
    });
  });

  describe('handleDeleteRequest', () => {
    test('should return method not allowed for resource deletion', () => {
      const mockReq = {};
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'test-value'
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource
      };

      handleDeleteRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('4.05');
      expect(mockRes.end).toHaveBeenCalledWith('Delete not allowed');
    });
  });

  describe('handleCreateRequest', () => {
    test('should create new object instance', () => {
      const mockReq = {
        payload: Buffer.from('{"0":"test-value"}'),
        headers: {
          'Content-Format': 'application/json'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const params = {
        objectId: 3
      };

      handleCreateRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('2.01');
      expect(mockRes.end).toHaveBeenCalledWith('Created');
    });

    test('should handle create request with instance ID', () => {
      const mockReq = {
        payload: Buffer.from('{"0":"test-value"}'),
        headers: {
          'Content-Format': 'application/json'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn(),
        setOption: jest.fn()
      };
      const params = {
        objectId: 3,
        instanceId: 1
      };

      handleCreateRequest(mockReq, mockRes, params);

      expect(mockRes.code).toBe('2.01');
      expect(mockRes.end).toHaveBeenCalledWith('Created');
    });
  });

  describe('handleProvisionCompleted', () => {
    test('should mark client as provisioned', () => {
      const mockReq = {};
      const mockRes = {
        code: null,
        end: jest.fn()
      };

      global.$ = {
        ...global.$,
        client: {
          provisioned: false
        }
      };

      handleProvisionCompleted(mockReq, mockRes);

      expect($.client.provisioned).toBe(true);
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalledWith('Bootstrap provisioning completed');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed CBOR payload gracefully', async () => {
      const mockReq = {
        payload: Buffer.from('invalid-cbor'),
        headers: {
          'Content-Format': 'application/cbor'
        }
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const mockResource = {
        value: 'old-value',
        writable: true
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: mockResource,
        observers: {},
        path: '3/0/0'
      };

      // Mock PayloadCodec.decode to reject
      const originalDecode = require('../../utils/payloadCodec').decode;
      require('../../utils/payloadCodec').decode = jest.fn().mockRejectedValue(new Error('Invalid CBOR'));

      handlePutRequest(mockReq, mockRes, params);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Restore original function
      require('../../utils/payloadCodec').decode = originalDecode;
    });

    test('should handle missing resource in PUT request', () => {
      const mockReq = {
        payload: Buffer.from('new-value'),
        headers: {}
      };
      const mockRes = {
        code: null,
        end: jest.fn()
      };
      const params = {
        objectId: 3,
        instanceId: 0,
        resourceId: 0,
        resource: null, // Missing resource
        observers: {},
        path: '3/0/0'
      };

      expect(() => {
        handlePutRequest(mockReq, mockRes, params);
      }).not.toThrow();
    });
  });
});