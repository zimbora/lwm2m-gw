// test/server/bootstrap.test.js
const { startBootstrapServer } = require('../../server/bootstrap');
const { 
  handleBootstrapRequest, 
  handleBootstrapFinish,
  setBootstrapConfiguration,
  getBootstrapConfiguration 
} = require('../../server/handleBootstrap');
const coap = require('coap');

jest.useFakeTimers();

describe('Bootstrap Server', () => {
  let server;
  const BOOTSTRAP_PORT = 5685; // Use different port for tests

  beforeAll(() => {
    server = startBootstrapServer(null, BOOTSTRAP_PORT);
  });

  afterAll((done) => {
    if (server) {
      server.close();
    }
    
    done();
  });

  test('should start bootstrap server on specified port', (done) => {
    expect(server).toBeDefined();
    done();
  });

  test('should handle bootstrap request', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: BOOTSTRAP_PORT,
      pathname: '/bs',
      method: 'POST',
      query: 'ep=test-client-bootstrap'
    });

    req.on('response', (res) => {
      console.log(res)
      expect(res.code).toBe('2.04');
      done();
    });

    req.on('error', done);
    req.end();
  });

  test('should handle bootstrap finish', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: BOOTSTRAP_PORT,
      pathname: '/bs-finish',
      method: 'POST',
      query: 'ep=test-client-bootstrap'
    });

    req.on('response', (res) => {
      expect(res.code).toBe('2.04');
      done();
    });

    req.on('error', done);
    req.end();
  });

  test('should return 4.04 for unknown paths', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: BOOTSTRAP_PORT,
      pathname: '/unknown',
      method: 'GET'
    });

    req.on('response', (res) => {
      expect(res.code).toBe('4.04');
      done();
    });

    req.on('error', done);
    req.end();
  });
});

describe('Bootstrap Configuration', () => {
  test('should set and get bootstrap configuration', () => {
    const testConfig = {
      securityInstances: [
        {
          instanceId: 0,
          serverUri: 'coap://test-server:5683',
          isBootstrap: false,
          securityMode: 3,
          shortServerId: 999
        }
      ],
      serverInstances: [
        {
          instanceId: 0,
          shortServerId: 999,
          lifetime: 1200,
          binding: 'U',
          notificationStoring: false
        }
      ]
    };

    setBootstrapConfiguration('test-endpoint', testConfig);
    const retrievedConfig = getBootstrapConfiguration('test-endpoint');

    expect(retrievedConfig).toEqual(testConfig);
  });

  test('should return default configuration for unknown endpoint', () => {
    const config = getBootstrapConfiguration('unknown-endpoint');
    
    expect(config).toBeDefined();
    expect(config.securityInstances).toBeDefined();
    expect(config.serverInstances).toBeDefined();
    expect(config.securityInstances[0].serverUri).toBe('coap://localhost:5683');
    expect(config.securityInstances[0].shortServerId).toBe(123);
  });
});

describe('Bootstrap Request Handling', () => {
  test('should handle valid bootstrap request', async () => {
    const mockReq = {
      url: '/bs?ep=test-client',
      rsinfo: { address: '127.0.0.1', port: 56830 }
    };
    const mockRes = {
      code: null,
      end: jest.fn()
    };

    const result = await handleBootstrapRequest(mockReq, mockRes);
    
    expect(result.ep).toBe('test-client');
    expect(mockRes.code).toBe('2.04');
    expect(mockRes.end).toHaveBeenCalled();
  });

  test('should reject bootstrap request without ep parameter', async () => {
    const mockReq = {
      url: '/bs',
      rsinfo: { address: '127.0.0.1', port: 56830 }
    };
    const mockRes = {
      code: null,
      end: jest.fn()
    };

    await expect(handleBootstrapRequest(mockReq, mockRes)).rejects.toThrow('Missing ep in bootstrap request');
    expect(mockRes.code).toBe('4.00');
  });

  test('should handle valid bootstrap finish', async () => {
    const mockReq = {
      url: '/bs-finish?ep=test-client',
      rsinfo: { address: '127.0.0.1', port: 56830 }
    };
    const mockRes = {
      code: null,
      end: jest.fn()
    };

    const result = await handleBootstrapFinish(mockReq, mockRes);
    
    expect(result.ep).toBe('test-client');
    expect(mockRes.code).toBe('2.04');
    expect(mockRes.end).toHaveBeenCalled();
  });
});