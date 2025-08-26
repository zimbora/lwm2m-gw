global.$ = {};
$.logger = require('../../client/logger.js');

jest.mock('coap', () => {
  const events = require('events');

  class Agent {
    constructor(options) {
      this.options = options;
    }
  }

  return {
    Agent,
    request: jest.fn((opts) => {
      const req = new events.EventEmitter();
      req.end = jest.fn();
      req.setOption = jest.fn();
      req.write = jest.fn();

      // Simulate response after next tick
      process.nextTick(() => {
        const res = new events.EventEmitter();
        res.code = '2.04'; // For update and deregister success (2.04 Changed)
        res.options = [];

        // If registration request (POST /rd) respond with 2.01 and Location-Path
        if (opts.pathname === '/rd' && opts.method === 'POST') {
          res.code = '2.01';
          res.options = [
            { name: 'Location-Path', value: Buffer.from('rd') },
            { name: 'Location-Path', value: Buffer.from('12345') },
          ];
        }

        req.emit('response', res);
      });

      return req;
    }),
  };
});

jest.mock('../../client/resourceServer', () => ({
  getSocket: jest.fn(() => ({})),
}));

const {
  registerToServer,
  updateRegistration,
  deregister,
  _resetRegistration,
} = require('../../client/registration');

describe('Client Registration', () => {
  test('should resolve registration successfully', async () => {
    await expect(
      registerToServer('test-ep', 'localhost', 5683)
    ).resolves.toBeUndefined();
  });

  test('updateRegistration should resolve when registered', async () => {
    await registerToServer('test-ep', 'localhost', 5683);
    await expect(
      updateRegistration('localhost', 5683)
    ).resolves.toBeUndefined();
  });

  test('deregister should resolve when registered', async () => {
    await registerToServer('test-ep', 'localhost', 5683);
    await expect(deregister('localhost', 5683)).resolves.toBeUndefined();
  });

  test('updateRegistration should reject if not registered', async () => {
    _resetRegistration();
    await expect(updateRegistration('localhost', 5683)).rejects.toBe(
      'Not registered.'
    );
  });

  test('deregister should reject if not registered', async () => {
    _resetRegistration();
    await expect(deregister('localhost', 5683)).rejects.toBe('Not registered.');
  });
});
