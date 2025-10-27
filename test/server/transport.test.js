// test/server/transport.test.js
const coap = require('coap');

// Mock coap module
jest.mock('coap', () => ({
  Agent: jest.fn().mockImplementation(() => ({ type: 'udp4' })),
  request: jest.fn()
}));

const { sendCoapRequest } = require('../../server/transport/coapClient');

describe('Server Transport', () => {
  
  describe('CoAP Client', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should validate client input', async () => {
      await expect(sendCoapRequest(null, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
      await expect(sendCoapRequest({}, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
    });
  });
  
});