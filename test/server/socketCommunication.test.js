// Test for socket-based communication with devices that don't have open UDP ports

const { registerClient, getClient } = require('../../server/clientRegistry');
const { sendCoapRequestViaSocket } = require('../../server/transport/coapClient');
const EventEmitter = require('events');
const coapPacket = require('coap-packet');

describe('Socket-based Device Communication', () => {
  let mockSocket;
  
  beforeEach(() => {
    // Create a mock socket that simulates a device connection
    mockSocket = new EventEmitter();
    mockSocket.write = jest.fn();
    mockSocket.destroyed = false;
    mockSocket.removeListener = jest.fn();
    mockSocket.once = jest.fn((event, handler) => {
      if (event === 'data') {
        // Simulate receiving a CoAP response
        setTimeout(() => {
          const responsePacket = coapPacket.generate({
            messageId: 12345,
            token: Buffer.from('test'),
            code: '2.05',
            payload: Buffer.from('device response')
          });
          handler(responsePacket);
        }, 10);
      }
    });
    mockSocket.on = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should communicate with device using existing socket when no port provided', async () => {
    // Register a client without a port but with a socket
    const ep = 'test-device-no-port';
    registerClient(ep, {
      address: '192.168.1.100',
      port: null, // No port provided - device doesn't have open UDP port
      protocol: 'coap',
      location: '/rd/12345',
      lifetime: 86400,
      binding: 'U',
      socket: mockSocket
    });

    // Verify client was registered correctly
    const client = getClient(ep);
    expect(client).toBeDefined();
    expect(client.port).toBeNull();
    expect(client.socket).toBe(mockSocket);

    // Test communication via socket
    const result = await sendCoapRequestViaSocket(
      mockSocket,
      'GET',
      '/3/0/0',
      null,
      '',
      { timeout: 1000 }
    );

    // Verify request was sent via socket
    expect(mockSocket.write).toHaveBeenCalledTimes(1);
    expect(result.code).toBe('2.05');
    expect(result.payload).toBe('device response');
    expect(result.socket).toBe(mockSocket);
  });

  test('should reject when socket is destroyed', async () => {
    mockSocket.destroyed = true;

    await expect(sendCoapRequestViaSocket(
      mockSocket,
      'GET',
      '/3/0/0'
    )).rejects.toThrow('Invalid or destroyed socket');
  });

  test('should handle socket write errors', async () => {
    mockSocket.write = jest.fn(() => {
      throw new Error('Socket write failed');
    });

    await expect(sendCoapRequestViaSocket(
      mockSocket,
      'GET',
      '/3/0/0'
    )).rejects.toThrow('Socket write failed');
  });

  test('should include observe option in CoAP packet', async () => {
    await sendCoapRequestViaSocket(
      mockSocket,
      'GET',
      '/3/0/0',
      null,
      '',
      { observe: 0 }
    );

    // Verify that the CoAP packet was generated with observe option
    expect(mockSocket.write).toHaveBeenCalledTimes(1);
    const writtenData = mockSocket.write.mock.calls[0][0];
    
    // Parse the generated packet to verify observe option
    const parsed = coapPacket.parse(writtenData);
    const observeOption = parsed.options.find(opt => opt.name === 'Observe');
    expect(observeOption).toBeDefined();
    expect(observeOption.value).toEqual(Buffer.from([0]));
  });

  test('should register client with socket during CoAP registration', () => {
    // Test that when a client registers without a port, the socket is stored
    const ep = 'test-device-socket-registration';
    registerClient(ep, {
      address: '192.168.1.101',
      port: undefined, // No port in registration query
      protocol: 'coap',
      location: '/rd/67890',
      lifetime: 86400,
      binding: 'U',
      socket: mockSocket
    });

    const client = getClient(ep);
    expect(client).toBeDefined();
    expect(client.socket).toBe(mockSocket);
    expect(client.port).toBeUndefined();
  });
});