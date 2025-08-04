// test/client/bootstrap.test.js
const { requestBootstrap, sendBootstrapFinish } = require('../../client/bootstrap');
const coap = require('coap');

// Mock the global $ object
global.$ = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
};

describe('Bootstrap Client', () => {
  let mockServer;
  const BOOTSTRAP_PORT = 5686; // Use different port for tests

  beforeAll((done) => {
    // Create mock bootstrap server
    mockServer = coap.createServer((req, res) => {
      const path = req?.url.split('?')[0];
      const method = req?.method;

      if (method === 'POST' && path === '/bs') {
        res.code = '2.04';
        res.end();
      } else if (method === 'POST' && path === '/bs-finish') {
        res.code = '2.04';
        res.end();
      } else {
        res.code = '4.04';
        res.end();
      }
    });

    mockServer.listen(BOOTSTRAP_PORT, done);
  });

  afterAll((done) => {
    if (mockServer) {
      mockServer.close(done);
    } else {
      done();
    }
  });

  test('should successfully request bootstrap', async () => {
    const result = await requestBootstrap('test-client', 'localhost', BOOTSTRAP_PORT);
    expect(result).toBeUndefined(); // Function resolves without returning value
    expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Bootstrap request accepted');
  });

  test('should successfully send bootstrap finish', async () => {
    const result = await sendBootstrapFinish('test-client', 'localhost', BOOTSTRAP_PORT);
    expect(result).toBeUndefined(); // Function resolves without returning value
    expect($.logger.info).toHaveBeenCalledWith('[Bootstrap Client] Bootstrap finish acknowledged');
  });

  test('should handle bootstrap request failure', async () => {
    // Test with invalid port to trigger error
    await expect(requestBootstrap('test-client', 'localhost', 9999)).rejects.toThrow();
  });

  test('should handle bootstrap finish failure', async () => {
    // Test with invalid port to trigger error
    await expect(sendBootstrapFinish('test-client', 'localhost', 9999)).rejects.toThrow();
  });
});