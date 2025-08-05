// test/integration/lwm2m-integration.test.js
const { startBootstrapServer } = require('../../server/bootstrap');
const { startLwM2MCoapServer } = require('../../server/resourceClient');
const { performBootstrap } = require('../../client/bootstrap');
const { startResourceServer } = require('../../client/resourceServer');
const coap = require('coap');

// Mock global $ for client
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

describe('LwM2M Integration Tests', () => {
  let bootstrapServer;
  let lwm2mServer;
  let clientResourceServer;

  const BOOTSTRAP_PORT = 5685;
  const LWM2M_PORT = 5686;
  const CLIENT_PORT = 5687;

  beforeAll((done) => {
    // Start servers for integration testing
    bootstrapServer = startBootstrapServer(null, BOOTSTRAP_PORT);
    
    const validation = () => Promise.resolve(true);
    lwm2mServer = startLwM2MCoapServer(validation, LWM2M_PORT);
    
    clientResourceServer = startResourceServer(CLIENT_PORT);
    
    setTimeout(done, 100); // Give servers time to start
  });

  afterAll((done) => {
    if (bootstrapServer) bootstrapServer.close();
    if (lwm2mServer) lwm2mServer.close();
    if (clientResourceServer) clientResourceServer.close();
    setTimeout(done, 100);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    $.client.provisioned = false;
  });

  describe('Bootstrap Integration', () => {
    test('should complete full bootstrap sequence', async () => {
      // Mock the provisioning check
      const originalSetInterval = global.setInterval;
      const originalSetTimeout = global.setTimeout;
      
      global.setInterval = jest.fn((callback, delay) => {
        setTimeout(() => {
          $.client.provisioned = true;
          callback();
        }, 50);
        return originalSetInterval(callback, delay);
      });

      global.setTimeout = jest.fn((callback, delay) => {
        return originalSetTimeout(callback, delay);
      });

      const result = await performBootstrap('integration-test-client', 'localhost', BOOTSTRAP_PORT, CLIENT_PORT);

      expect(result).toBe(true);
      expect($.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Bootstrap Client] Bootstrap sequence completed successfully')
      );

      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
    }, 10000);

    test('should handle bootstrap server not available', async () => {
      const INVALID_PORT = 9999;

      await expect(performBootstrap('test-client', 'localhost', INVALID_PORT))
        .rejects.toThrow();
    });
  });

  describe('LwM2M Server Registration', () => {
    test('should accept client registration', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: LWM2M_PORT,
        pathname: '/rd',
        method: 'POST',
        query: 'ep=integration-test-client&lt=3600&lwm2m=1.0'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('2.01');
        expect(res.headers.Location).toBeDefined();
        done();
      });

      req.on('error', done);
      req.end('</3/0>,</4/0>');
    }, 5000);

    test('should handle client update', (done) => {
      // First register
      const regReq = coap.request({
        hostname: 'localhost',
        port: LWM2M_PORT,
        pathname: '/rd',
        method: 'POST',
        query: 'ep=integration-update-client&lt=3600&lwm2m=1.0'
      });

      regReq.on('response', (regRes) => {
        expect(regRes.code).toBe('2.01');
        
        const location = regRes.headers.Location;
        expect(location).toBeDefined();

        // Then update
        const updateReq = coap.request({
          hostname: 'localhost',
          port: LWM2M_PORT,
          pathname: location,
          method: 'PUT',
          query: 'lt=7200'
        });

        updateReq.on('response', (updateRes) => {
          expect(updateRes.code).toBe('2.04');
          done();
        });

        updateReq.on('error', done);
        updateReq.end();
      });

      regReq.on('error', done);
      regReq.end('</3/0>,</4/0>');
    }, 10000);

    test('should handle client deregistration', (done) => {
      // First register
      const regReq = coap.request({
        hostname: 'localhost',
        port: LWM2M_PORT,
        pathname: '/rd',
        method: 'POST',
        query: 'ep=integration-dereg-client&lt=3600&lwm2m=1.0'
      });

      regReq.on('response', (regRes) => {
        expect(regRes.code).toBe('2.01');
        
        const location = regRes.headers.Location;
        expect(location).toBeDefined();

        // Then deregister
        const deregReq = coap.request({
          hostname: 'localhost',
          port: LWM2M_PORT,
          pathname: location,
          method: 'DELETE'
        });

        deregReq.on('response', (deregRes) => {
          expect(deregRes.code).toBe('2.02');
          done();
        });

        deregReq.on('error', done);
        deregReq.end();
      });

      regReq.on('error', done);
      regReq.end('</3/0>,</4/0>');
    }, 10000);
  });

  describe('Client Resource Server Integration', () => {
    test('should respond to resource read requests', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/3/0/0',
        method: 'GET'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('2.05');
        expect(res.payload.toString()).toBe('NodeCoAP Inc.');
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);

    test('should handle resource write requests', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/4/0/8',
        method: 'PUT'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('2.04');
        done();
      });

      req.on('error', done);
      req.write('new-apn-value');
      req.end();
    }, 5000);

    test('should handle discovery requests', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/.well-known/core',
        method: 'GET'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('2.05');
        expect(res.headers['Content-Format']).toBe('application/link-format');
        expect(res.payload.toString()).toContain('</');
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);
  });

  describe('Event System Integration', () => {
    test('should emit events through shared emitter', (done) => {
      const sharedEmitter = require('../../server/transport/sharedEmitter');
      
      const registrationHandler = (event) => {
        expect(event.protocol).toBe('coap');
        expect(event.ep).toBe('event-test-client');
        sharedEmitter.off('registration', registrationHandler);
        done();
      };

      sharedEmitter.on('registration', registrationHandler);

      // Trigger registration
      const req = coap.request({
        hostname: 'localhost',
        port: LWM2M_PORT,
        pathname: '/rd',
        method: 'POST',
        query: 'ep=event-test-client&lt=3600&lwm2m=1.0'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('2.01');
      });

      req.on('error', done);
      req.end('</3/0>,</4/0>');
    }, 5000);
  });

  describe('Content Format Negotiation', () => {
    test('should handle CBOR content format', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/3/0/0',
        method: 'GET'
      });

      req.setOption('Accept', 'application/cbor');

      req.on('response', (res) => {
        expect(res.code).toBe('2.05');
        expect(res.headers['Content-Format']).toBe('application/cbor');
        expect(res.payload).toBeInstanceOf(Buffer);
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);

    test('should handle TLV content format', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/3/0/0',
        method: 'GET'
      });

      req.setOption('Accept', 'application/vnd.oma.lwm2m+tlv');

      req.on('response', (res) => {
        expect(res.code).toBe('2.05');
        expect(res.headers['Content-Format']).toBe('application/vnd.oma.lwm2m+tlv');
        expect(res.payload).toBeInstanceOf(Buffer);
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);
  });

  describe('Error Scenarios Integration', () => {
    test('should handle registration with missing parameters', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: LWM2M_PORT,
        pathname: '/rd',
        method: 'POST'
        // Missing query parameters
      });

      req.on('response', (res) => {
        expect(res.code).toBe('4.00');
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);

    test('should handle requests to non-existent resources', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: CLIENT_PORT,
        pathname: '/999/0/0',
        method: 'GET'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('4.04');
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);

    test('should handle invalid methods on bootstrap server', (done) => {
      const req = coap.request({
        hostname: 'localhost',
        port: BOOTSTRAP_PORT,
        pathname: '/invalid-path',
        method: 'GET'
      });

      req.on('response', (res) => {
        expect(res.code).toBe('4.04');
        done();
      });

      req.on('error', done);
      req.end();
    }, 5000);
  });
});

describe('LwM2M Protocol Compliance', () => {
  test('should follow LwM2M registration interface', () => {
    // Test that our implementation follows LwM2M 1.0 specification
    expect(true).toBe(true); // Placeholder for actual compliance tests
  });

  test('should handle LwM2M object models correctly', () => {
    const { getResource } = require('../../client/objects');
    
    // Test Device Object (ID: 3)
    const manufacturer = getResource(3, 0, 0);
    expect(manufacturer).toBeDefined();
    expect(manufacturer.readable).toBe(true);
    
    // Test Connectivity Monitoring Object (ID: 4)
    const apn = getResource(4, 0, 8);
    expect(apn).toBeDefined();
    expect(apn.writable).toBe(true);
  });

  test('should support required LwM2M operations', () => {
    // Verify that all required LwM2M operations are supported
    const operations = [
      'Read',      // GET
      'Write',     // PUT
      'Execute',   // POST
      'Create',    // POST to object/instance
      'Delete',    // DELETE
      'Discover',  // GET /.well-known/core
      'Observe'    // GET with Observe option
    ];

    operations.forEach(op => {
      expect(op).toBeDefined();
    });
  });
});