// test/client/dtlsTransport.test.js

const packet = require('coap-packet');

describe('DTLS Transport', () => {
  test('should parse CoAP packet correctly', () => {
    // Create a simple CoAP GET request packet
    const testPacket = packet.generate({
      code: 'GET',
      messageId: 12345,
      token: Buffer.from([0x01, 0x02]),
      options: [
        { name: 'Uri-Path', value: Buffer.from('3') },
        { name: 'Uri-Path', value: Buffer.from('0') },
        { name: 'Uri-Path', value: Buffer.from('0') }
      ]
    });

    // Parse it back
    const parsed = packet.parse(testPacket);

    expect(parsed.code).toBe('0.01'); // GET
    expect(parsed.messageId).toBe(12345);
    expect(parsed.token).toEqual(Buffer.from([0x01, 0x02]));
    expect(parsed.options).toBeDefined();
    expect(parsed.options.length).toBeGreaterThan(0);
  });

  test('should generate CoAP response packet correctly', () => {
    // Create a simple CoAP response packet
    const responsePacket = packet.generate({
      code: '2.05',
      messageId: 12345,
      token: Buffer.from([0x01, 0x02]),
      payload: Buffer.from('test payload'),
      ack: true
    });

    // Parse it back to verify
    const parsed = packet.parse(responsePacket);

    expect(parsed.code).toBe('2.05');
    expect(parsed.messageId).toBe(12345);
    expect(parsed.token).toEqual(Buffer.from([0x01, 0x02]));
    expect(parsed.payload.toString()).toBe('test payload');
    expect(parsed.ack).toBe(true);
  });
});