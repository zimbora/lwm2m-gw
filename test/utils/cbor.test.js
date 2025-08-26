const { encodeResourcesToCBOR, decodeCBOR } = require('../../utils/cbor');

describe('CBOR Utils', () => {
  test('should encode and decode integer resource', async () => {
    const input = { 1: { value: 42, type: 'integer', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['1']).toBe(42);
  });

  test('should encode and decode unsigned integer resource', async () => {
    const input = { 2: { value: 65535, type: 'unsigned', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['2']).toBe(65535);
  });

  test('should encode and decode float resource', async () => {
    const input = { 3: { value: 3.1415, type: 'float', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['3']).toBeCloseTo(3.1415, 5);
  });

  test('should encode and decode double resource', async () => {
    const input = { 4: { value: Math.PI, type: 'double', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['4']).toBeCloseTo(Math.PI, 10);
  });

  test('should encode and decode string resource', async () => {
    const input = {
      5: { value: 'hello world', type: 'string', readable: true },
    };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['5']).toBe('hello world');
  });

  test('should encode and decode boolean true resource', async () => {
    const input = { 6: { value: true, type: 'boolean', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['6']).toBe(true);
  });

  test('should encode and decode boolean false resource', async () => {
    const input = { 7: { value: false, type: 'boolean', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(decoded['7']).toBe(false);
  });

  test('should encode and decode opaque buffer resource', async () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const input = { 8: { value: buf, type: 'opaque', readable: true } };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded);
    expect(Buffer.isBuffer(decoded['8'])).toBe(true);
    expect(decoded['8'].equals(buf)).toBe(true);
  });

  test('should encode and decode time resource as Unix timestamp', async () => {
    const date = new Date('2025-07-16T12:34:56Z');
    const unixTime = Math.floor(date.getTime() / 1000);
    const input = {
      9: { value: date.toISOString(), type: 'time', readable: true },
    };
    const encoded = encodeResourcesToCBOR(input);
    const decoded = await decodeCBOR(encoded, { 9: 'time' });
    expect(decoded['9']).toBe(unixTime);
  });
});
