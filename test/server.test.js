// tests/server.test.js
const coap = require('coap');
const { registerClient, getClient, deregisterClientByLocation, updateClient } = require('../server/clientRegistry');
const { handleRegister, handleUpdate, handleDeregister } = require('../server/handlers'); // hypothetical handlers

describe('LwM2M Server', () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: '',
      url: '',
      rsinfo: { address: '127.0.0.1', port: 56830 },
      options: [],
    };
    res = {
      code: null,
      end: jest.fn(),
      setOption: jest.fn(),
    };
  });

  describe('Registration', () => {
    test('should register client successfully', () => {
      req.method = 'POST';
      req.url = '/rd?ep=test-client&lt=300&b=U';

      handleRegister(req, res);

      expect(res.code).toBe('2.01');
      expect(res.setOption).toHaveBeenCalledWith(
        'Location-Path',
        expect.any(Array)
      );
      expect(res.end).toHaveBeenCalled();

      const client = getClient('test-client');
      expect(client).toBeDefined();
      expect(client.address).toBe('127.0.0.1');
      expect(client.lifetime).toBe(300);
    });

    test('should reject registration missing ep', () => {
      req.method = 'POST';
      req.url = '/rd?lt=300';

      expect(() => handleRegister(req, res)).toThrow('Missing endpoint name');
    });
  });

  describe('Update Registration', () => {
    test('should update client lifetime', () => {
      // Setup existing client first
      registerClient('test-client', { address: '127.0.0.1', port: 56830, location: '/rd/12345', lifetime: 300 });

      req.method = 'POST';
      req.url = '/rd/12345?lt=600';

      handleUpdate(req, res);

      expect(res.code).toBe('2.04');
      expect(res.end).toHaveBeenCalled();

      const client = getClient('test-client');
      expect(client.lifetime).toBe(600);
    });

    test('should reject update for unknown location', () => {
      req.method = 'POST';
      req.url = '/rd/99999?lt=600';

      expect(() => handleUpdate(req, res)).toThrow('Registration not found');
    });
  });

  describe('Deregistration', () => {
    test('should deregister client', () => {
      registerClient('test-client', { address: '127.0.0.1', port: 56830, location: '/rd/12345', lifetime: 300 });

      req.method = 'DELETE';
      req.url = '/rd/12345';

      handleDeregister(req, res);

      expect(res.code).toBe('2.02');
      expect(res.end).toHaveBeenCalled();

      const client = getClient('test-client');
      expect(client).toBeUndefined();
    });

    test('should reject deregistration for unknown location', () => {
      req.method = 'DELETE';
      req.url = '/rd/99999';

      expect(() => handleDeregister(req, res)).toThrow('Registration not found');
    });
  });

  // Add more tests for malformed requests, invalid methods, etc.
});
