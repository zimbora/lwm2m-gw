const coap = require('coap');
const sharedEmitter = require('../../server/transport/sharedEmitter');
const { startLwM2MCoapServer } = require('../../server/resourceClient');
const {
  registerObservation,
  getObservation,
  deregisterObservation,
  cleanup,
} = require('../../server/observationRegistry');

describe('LwM2M CoAP Server - sharedEmitter events', () => {
  let server;
  let locationPath = null;
  const testToken = Buffer.from('abcd', 'hex'); // fixed token for testing
  const testEp = 'test-client';
  const testPath = '/3/0/1'; // example resource

  beforeAll((done) => {
    server = startLwM2MCoapServer();
    setTimeout(done, 200); // Give server time to start
  });

  afterAll((done) => {
    cleanup();
    if (server && typeof server.close === 'function') {
      server.close(done);
    } else {
      done();
    }
  });

  it('should emit "registration" on client registration', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      method: 'POST',
      pathname: '/rd',
      confirmable: true,
      query: 'ep=test-client&lt=60&lwm2m=1.0',
    });

    sharedEmitter.once('registration', (event) => {
      expect(event).toHaveProperty('ep', 'test-client');
      expect(event).toHaveProperty('location');
      locationPath = event.location; // Save for later tests
      done();
    });

    req.setOption('Content-Format', 'application/link-format');
    req.write('</1/0>,</3/0>');
    req.end();
  });

  it('should emit "update" on registration update', (done) => {
    if (!locationPath) {
      return done.fail('No locationPath from registration');
    }

    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      method: 'PUT',
      pathname: locationPath,
      confirmable: true,
      query: 'lt=120',
    });

    sharedEmitter.once('update', (event) => {
      expect(event).toHaveProperty('ep', 'test-client');
      expect(event).toHaveProperty('location', locationPath);
      done();
    });

    req.setOption('Content-Format', 'text/plain');
    req.write('</1/0>,</3/0>');
    req.end();
  });

  it('should emit "deregistration" on registration delete', (done) => {
    if (!locationPath) {
      return done.fail('No locationPath from registration');
    }

    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      method: 'DELETE',
      pathname: locationPath,
      confirmable: true,
    });

    sharedEmitter.once('deregistration', (event) => {
      expect(event).toHaveProperty('ep', 'test-client');
      expect(event).toHaveProperty('protocol');
      done();
    });

    req.end();
  });

  it('should emit "observation" when observe request is received', (done) => {
    // Register a fake observation manually
    registerObservation(testToken, testEp, testPath, (format = 'text'));

    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      method: 'GET',
      pathname: testPath,
      confirmable: true,
      observe: 0,
      token: testToken,
    });

    sharedEmitter.once('observation', (event) => {
      expect(event).toHaveProperty('ep', testEp);
      expect(event).toHaveProperty('method', 'GET');
      expect(event).toHaveProperty('path', testPath);
      expect(event).toHaveProperty('payload'); // May be empty if no payload is sent
      done();
    });

    req.setOption('Content-Format', 'text/plain');

    req.write('test-observe-payload');
    req.end();
  });

  it('should emit "error" when observe request is received and token is not registered', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      method: 'GET',
      pathname: testPath,
      confirmable: true,
      observe: 0,
      token: 'testWrongToken',
    });

    sharedEmitter.once('error', (event) => {
      expect(event).toHaveProperty('error');
      done();
    });

    req.setOption('Content-Format', 'text/plain');

    req.write('test-observe-payload');
    req.end();
  });
});
