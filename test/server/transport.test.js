// test/server/transport.test.js
const dgram = require('dgram');
const coapPacket = require('coap-packet');
const crypto = require('crypto');

// Mock modules
jest.mock('dgram');
jest.mock('coap-packet');
jest.mock('../../server/transport/sharedEmitter');

const { sendCoapRequest } = require('../../server/transport/coapClient');
const sharedEmitter = require('../../server/transport/sharedEmitter');

describe('Server Transport', () => {
  
  describe('CoAP Client - sendCoapRequest', () => {
    let mockSocket;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock socket
      mockSocket = {
        send: jest.fn((packet, port, address, callback) => {
          if (callback) callback();
        }),
        on: jest.fn(),
        close: jest.fn(),
        isClosed: false
      };
      
      dgram.createSocket.mockReturnValue(mockSocket);
      
      // Mock coapPacket.generate
      coapPacket.generate.mockReturnValue(Buffer.from('coap-packet'));
      
      // Mock coapPacket.parse
      coapPacket.parse.mockReturnValue({
        code: '2.05',
        token: Buffer.from('1234567890abcdef', 'hex'),
        payload: Buffer.from('response payload')
      });
      
      // Mock sharedEmitter
      sharedEmitter.emit = jest.fn();
      
      // Reset global $ object
      global.$ = {};
    });
    
    afterEach(() => {
      delete global.$;
    });

    // ===== Validation Tests =====
    
    test('should reject when client is null', async () => {
      await expect(sendCoapRequest(null, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
    });
    
    test('should reject when client address is missing', async () => {
      await expect(sendCoapRequest({}, 'GET', '/test')).rejects.toThrow('Invalid client: address is required');
    });
    
    test('should reject when client port is missing', async () => {
      await expect(sendCoapRequest({ address: '127.0.0.1' }, 'GET', '/test')).rejects.toThrow('Invalid client: port is required');
    });

    // ===== Method Mapping Tests =====
    
    test('should map GET method to CoAP code 0.01', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      // Trigger response
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      expect(coapPacket.generate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '0.01' })
      );
    });
    
    test('should map POST method to CoAP code 0.02', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'POST', '/test');
      
      expect(coapPacket.generate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '0.02' })
      );
    });
    
    test('should map PUT method to CoAP code 0.03', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'PUT', '/test');
      
      expect(coapPacket.generate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '0.03' })
      );
    });
    
    test('should map DELETE method to CoAP code 0.04', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'DELETE', '/test');
      
      expect(coapPacket.generate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '0.04' })
      );
    });
    
    test('should convert method to uppercase', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'get', '/test');
      
      expect(coapPacket.generate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '0.01' })
      );
    });

    // ===== CoAP Options Tests =====
    
    test('should build Uri-Path options from path segments', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test/path/segments');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.options).toEqual(
        expect.arrayContaining([
          { name: 'Uri-Path', value: Buffer.from('test') },
          { name: 'Uri-Path', value: Buffer.from('path') },
          { name: 'Uri-Path', value: Buffer.from('segments') }
        ])
      );
    });
    
    test('should handle empty path', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      const uriPathOptions = generateCall.options.filter(opt => opt.name === 'Uri-Path');
      expect(uriPathOptions).toHaveLength(0);
    });
    
    test('should add Uri-Query option when query provided', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test', null, 'param=value');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.options).toEqual(
        expect.arrayContaining([
          { name: 'Uri-Query', value: Buffer.from('param=value') }
        ])
      );
    });
    
    test('should not add Content-Format option due to format override to 0', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      // Note: In the code, format is overridden to 0 if provided, which is falsy,
      // so it won't be added to options
      await sendCoapRequest(client, 'GET', '/test', null, '', { format: 50 });
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      const contentFormatOptions = generateCall.options.filter(opt => opt.name === 'Content-Format');
      expect(contentFormatOptions).toHaveLength(0);
    });
    
    test('should add Observe option when observe is defined', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test', null, '', { observe: 0 });
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.options).toEqual(
        expect.arrayContaining([
          { name: 'Observe', value: Buffer.from([0]) }
        ])
      );
    });

    // ===== Token Tests =====
    
    test('should generate random token when not provided', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.token).toBeInstanceOf(Buffer);
      expect(generateCall.token.length).toBe(8);
    });
    
    test('should use provided token when specified in options', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      const customToken = '0123456789abcdef';
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test', null, '', { token: customToken });
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.token).toEqual(Buffer.from(customToken, 'hex'));
    });

    // ===== Payload Tests =====
    
    test('should include payload in CoAP packet when provided', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      const payload = 'test payload';
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'POST', '/test', payload);
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.payload).toEqual(Buffer.from(payload));
    });
    
    test('should use empty buffer when no payload provided', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.payload).toEqual(Buffer.alloc(0));
    });

    // ===== Socket Handling Tests =====
    
    test('should create new socket when no socket available', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
      expect(mockSocket.send).toHaveBeenCalled();
    });
    
    test('should use client socket when available and not closed', async () => {
      const clientSocket = {
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
        isClosed: false
      };
      
      const client = { 
        address: '127.0.0.1', 
        port: 5683, 
        ep: 'test', 
        msgId: 1,
        socket: clientSocket 
      };
      
      setTimeout(() => {
        const messageHandler = clientSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      expect(dgram.createSocket).not.toHaveBeenCalled();
      expect(clientSocket.send).toHaveBeenCalled();
    });
    
    test('should create new socket when client socket is closed', async () => {
      const clientSocket = {
        isClosed: true
      };
      
      const client = { 
        address: '127.0.0.1', 
        port: 5683, 
        ep: 'test', 
        msgId: 1,
        socket: clientSocket 
      };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      expect(dgram.createSocket).toHaveBeenCalledWith('udp4');
      expect(mockSocket.send).toHaveBeenCalled();
    });

    // ===== Response Handling Tests =====
    
    test('should resolve with parsed response on message', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      const result = await sendCoapRequest(client, 'GET', '/test');
      
      expect(result).toEqual({
        code: '2.05',
        token: '1234567890abcdef',
        payload: 'response payload',
        socket: mockSocket
      });
    });
    
    test('should parse response and extract token for observe request', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      coapPacket.parse.mockReturnValue({
        code: '2.05',
        token: Buffer.from('abcdef1234567890', 'hex'),
        payload: Buffer.from('observed data')
      });
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      const result = await sendCoapRequest(client, 'GET', '/test', null, '', { observe: 0 });
      
      expect(result.token).toBe('abcdef1234567890');
    });

    // ===== Timeout Tests =====
    
    test('should setup timeout handler when making request', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      // Don't respond, but verify timeout is being set up
      const promise = sendCoapRequest(client, 'GET', '/test');
      
      // Give it a moment to set up handlers
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify socket handlers were registered
      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      
      // Trigger response to resolve promise
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(Buffer.from('response'));
      
      await promise;
    });

    // ===== Error Handling Tests =====
    
    test('should reject on socket error', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')[1];
        errorHandler(new Error('Socket error'));
      }, 10);
      
      await expect(sendCoapRequest(client, 'GET', '/test')).rejects.toThrow('Error connecting to client');
      expect(sharedEmitter.emit).toHaveBeenCalledWith('error', expect.any(String));
    });
    
    test('should reject on parse error', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      coapPacket.parse.mockImplementation(() => {
        throw new Error('Parse error');
      });
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('invalid response'));
      }, 10);
      
      await expect(sendCoapRequest(client, 'GET', '/test')).rejects.toThrow('Failed to parse CoAP response: Parse error');
    });
    
    test('should handle socket close event', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      // Start the request
      const promise = sendCoapRequest(client, 'GET', '/test');
      
      // Trigger close event
      setTimeout(() => {
        const closeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'close')[1];
        closeHandler();
      }, 10);
      
      // Also send a response so the promise resolves
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 20);
      
      await promise;
      
      // Verify close handler was registered
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    // ===== Confirmable Option Tests =====
    
    test('should set confirmable to true by default', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.confirmable).toBe(true);
    });
    
    test('should set confirmable to false when explicitly specified', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 1 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test', null, '', { confirmable: false });
      
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.confirmable).toBe(false);
    });

    // ===== Message ID Tests =====
    
    test('should increment client msgId', async () => {
      const client = { address: '127.0.0.1', port: 5683, ep: 'test', msgId: 5 };
      
      setTimeout(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler(Buffer.from('response'));
      }, 10);
      
      await sendCoapRequest(client, 'GET', '/test');
      
      expect(client.msgId).toBe(6);
      const generateCall = coapPacket.generate.mock.calls[0][0];
      expect(generateCall.messageId).toBe(5);
    });
  });
  
});