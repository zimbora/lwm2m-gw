const { encodeTLV, decodeTLV } = require('../../utils/tlv');

describe('TLV Utils', () => {
  test('should encode and decode a single integer resource', () => {
    const encoded = encodeTLV(0, 2, 'integer');
    const decoded = decodeTLV(encoded, { 0: 'integer' });

    expect(decoded['0']).toBe(2);
  });

  test('should handle unsigned integer values', () => {
    const encoded = encodeTLV(1, 65535, 'unsigned');
    const decoded = decodeTLV(encoded, { 1: 'unsigned' });

    expect(decoded['1']).toBe(65535);
  });

  test('should handle float values', () => {
    const encoded = encodeTLV(2, 3.14, 'float');
    const decoded = decodeTLV(encoded, { 2: 'float' });

    expect(decoded['2']).toBeCloseTo(3.14, 2);
  });

  test('should handle double values', () => {
    const encoded = encodeTLV(3, Math.PI, 'double');
    const decoded = decodeTLV(encoded, { 3: 'double' }); // ✅ FIXED

    expect(decoded['3']).toBeCloseTo(Math.PI, 10);
  });

  test('should handle string values', () => {
    const encoded = encodeTLV(4, 'hello', 'string');
    const decoded = decodeTLV(encoded, { 4: 'string' });

    expect(decoded['4']).toBe('hello');
  });

  test('should handle boolean true', () => {
    const encoded = encodeTLV(5, true, 'boolean');
    const decoded = decodeTLV(encoded, { 5: 'boolean' });

    expect(decoded['5']).toBe(true);
  });

  test('should handle boolean false', () => {
    const encoded = encodeTLV(6, false, 'boolean');
    const decoded = decodeTLV(encoded, { 6: 'boolean' });

    expect(decoded['6']).toBe(false);
  });

  test('should handle opaque buffer values', () => {
    const input = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const encoded = encodeTLV(7, input, 'opaque');
    const decoded = decodeTLV(encoded, { 7: 'opaque' }); // ✅ FIXED

    expect(Buffer.isBuffer(decoded['7'])).toBe(true);
    expect(decoded['7'].equals(input)).toBe(true);
  });

  test('should handle opaque hex string values', () => {
    const encoded = encodeTLV(8, 'cafebabe', 'opaque');
    const decoded = decodeTLV(encoded, { 8: 'opaque' }); // ✅ FIXED

    expect(Buffer.isBuffer(decoded['8'])).toBe(true);
    expect(decoded['8'].toString('hex')).toBe('cafebabe');
  });

  test('should handle time values as ISO strings', () => {
    const date = new Date();
    const encoded = encodeTLV(9, date.toISOString(), 'time');
    const decoded = decodeTLV(encoded, { 9: 'time' }); // ✅ FIXED

    const expected = Math.floor(date.getTime() / 1000);
    expect(decoded['9']).toBe(expected);
  });
});