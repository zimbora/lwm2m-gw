const { registerObservation, getObservation, deregisterObservation } = require('../../server/observationRegistry');

describe('ObservationRegistry', () => {
  let registry;
  const tokenBuffer = Buffer.from('abcd', 'hex');
  const tokenString = 'abcd';
  const ep = 'client123';
  const path = '/3/0/13';
  const format = 'text';
  const socket = null;


  test('registerObservation stores observation with buffer token', () => {
    const result = registerObservation(tokenBuffer, ep, path, format);
    expect(result).toBe(true);

    const observation = getObservation(tokenBuffer);
    expect(observation).toEqual({ ep, path, format, socket });
  });

  test('registerObservation stores observation with string token', () => {
    const result = registerObservation(tokenString, ep, path, format);
    expect(result).toBe(true);

    const observation = getObservation(tokenString);
    expect(observation).toEqual({ ep, path, format, socket });
  });

  test('getObservation returns null for unknown token', () => {
    const unknownToken = Buffer.from('deadbeef', 'hex');
    expect(getObservation(unknownToken)).toBeNull();
  });

  test('deregisterObservation removes observation', () => {
    registerObservation(tokenBuffer, ep, path, format);
    const removed = deregisterObservation(tokenBuffer);
    expect(removed).toBe(true);

    expect(getObservation(tokenBuffer)).toBeNull();
  });

  test('deregisterObservation returns false for unknown token', () => {
    const removed = deregisterObservation(Buffer.from('1234', 'hex'));
    expect(removed).toBe(false);
  });

  test('throws error when registering without required fields', () => {
    expect(() => registerObservation(null, ep, path, format)).toThrow();
    expect(() => registerObservation(tokenBuffer, null, path, format)).toThrow();
    expect(() => registerObservation(tokenBuffer, ep, null, format)).toThrow();
    expect(() => registerObservation(tokenBuffer, ep, path, null)).toThrow();
  });

  test('throws error when retrieving with no token', () => {
    expect(() => getObservation(null)).toThrow();
  });

  test('throws error when deregistering with no token', () => {
    expect(() => deregisterObservation(null)).toThrow();
  });
});
