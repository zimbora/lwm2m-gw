// tests/resourceServer.test.js
global.$ = {};
$.logger = require('../../client/logger.js');

const coap = require('coap');
const { startResourceServer, getResource, stopObservation } = require('../../client/resourceServer');

const PORT = 56831;

describe('Resource Server', () => {

  let server;
  beforeAll(() => {
    server = startResourceServer(PORT);
  });

  afterAll((done) => {
    server.close(() => {
      done();
      const sockets = require('coap/lib/server')._sock;
      if (sockets && sockets._handle) sockets._handle.close();
    });
  });

  test('should respond to GET with plain text', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/3/0/0',
    });

    req.on('response', (res) => {
      expect(res.code).toBe('2.05');
      expect(res.payload.toString()).toBe('NodeCoAP Inc.');
      done();
    });

    req.end();
  });

  test('should respond with CBOR if Accept: application/cbor (60)', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/3/0/0',
    });

    //req.setOption('Accept', 60);
    req.setOption('Accept', 'application/cbor');

    req.on('response', (res) => {
      expect(res.code).toBe('2.05');
      expect(res.headers['Content-Format']).toBe('application/cbor');
      expect(res.payload).toBeInstanceOf(Buffer);
      done();
    });

    req.end();
  });

  test('should respond with TLV if Accept: application/vnd.oma.lwm2m+tlv (11542)', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/3/0/0',
    });

    req.setOption('Accept', 'application/vnd.oma.lwm2m+tlv');

    req.on('response', (res) => {
      expect(res.code).toBe('2.05');
      expect(res.headers['Content-Format']).toBe('application/vnd.oma.lwm2m+tlv');
      expect(res.payload).toBeInstanceOf(Buffer);
      done();
    });

    req.end();
  });

  test('should reject write if resource not writable', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'PUT',
      pathname: '/3/0/0',
    });

    req.write('Unauthorized update');

    req.on('response', (res) => {
      expect(res.code).toBe('4.05');
      done();
    });

    req.end();
  });

  test('should accept write if resource is writable', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'PUT',
      pathname: '/4/0/8',
    });

    req.write('newApn');

    req.on('response', (res) => {
      expect(res.code).toBe('2.04');
      done();
    });

    req.end();
  });

  test('should reject observation if resource is not observable', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/4/0/1',
      confirmable: true,
      observe: 1
    });

    req.on('response', (res) => {
      console.log(res.code)
      expect(res.code).toBe('4.05');
      done();
    });

    req.end();
  });

  test('should accept observation if resource is observable', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/4/0/4',
      confirmable: true,
      observe: 1
    });

    req.on('response', (res) => {
      expect(res.code).toBe('2.05');
      expect(res.headers['Observe']).toBeDefined();
      expect(res.payload.toString()).not.toBe('');

      const resource = getResource(4, 0, 4);
      done();
    });

    req.end();
  });

  test('should accept observation if resource is observable', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port: PORT,
      method: 'GET',
      pathname: '/4/0/4',
      confirmable: true,
      observe: 0
    });

    req.on('response', (res) => {
      expect(res.code).toBe('2.05');
      expect(res.headers['Observe']).toBeDefined();
      expect(res.payload.toString()).not.toBe('');

      const resource = getResource(4, 0, 4);
      done();
    });

    req.end();
  });

});


describe('Resource Server Error Handling', () => {
  let server;
  const port = 56840;

  beforeAll(done => {
    server = startResourceServer(port);
    done();
  });

  afterAll(done => {
    server.close(done);
  });

  test('should respond 4.04 for invalid resource path', (done) => {
    const req = coap.request({
      hostname: 'localhost',
      port,
      method: 'GET',
      pathname: '/9999/0/0',
    });

    req.on('response', (res) => {
      expect(res.code).toBe('4.04');
      expect(res.payload.toString()).toBe('Resource not found');
      done();
    });

    req.end();
  });

});

/*
jest.useFakeTimers();

describe('Resource Server Observation Handling', () => {
  let server;
  let port = 56840; // test port

  beforeAll(done => {
    server = startResourceServer(port);
    done();
  });

  afterAll(done => {
    server.close(done);
  });

  test('should register observer and send initial notification', done => {
    const req = {
      method: 'GET',
      url: '/3303/0/5700', // Temperature Sensor Value
      headers: { Observe: '' },
      rsinfo: { address: '127.0.0.1', port: 5683 },
      _packet: { token: Buffer.from([1, 2, 3, 4]) }
    };

    const res = {
      setOption: jest.fn(),
      end: jest.fn(() => {
        try {
          // Expect Observe option set to 0 for initial notification
          expect(res.setOption).toHaveBeenCalledWith('Observe', 0);
          expect(res.end).toHaveBeenCalledWith(expect.any(String));
          done();
        } catch (e) {
          done(e);
        }
      })
    };

    // Directly call the server's request handler
    server.emit('request', req, res);
  });

  test('should send periodic notifications to observer', done => {
    // Setup observer data as if registered
    const observerPath = '3303/0/5700';
    const observer = {
      address: '127.0.0.1',
      port: 5683,
      token: Buffer.from([1, 2, 3, 4]),
      observeSeq: 1,
    };

    // Access observers map and add observer manually
    const observers = server._events.request._events[0].observers || {};
    observers[observerPath] = [observer];

    // Mock sendNotification to verify calls
    server._events.request._events[0].sendNotification = jest.fn();

    // Fast-forward timers to trigger interval
    jest.advanceTimersByTime(2100);

    setImmediate(() => {
      expect(server._events.request._events[0].sendNotification).toHaveBeenCalled();
      done();
    });
  });
});
*/