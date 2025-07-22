const PayloadCodec = require('../../utils/payloadCodec');
const CONTENT_FORMATS = require('../../utils/contentFormats');

// Mocked dependencies
jest.mock('../../utils/cbor', () => ({
  encodeResourcesToCBOR: jest.fn(() => Buffer.from([0xa1])),
  decodeCBOR: jest.fn(() => ({ decoded: true })),
}));

jest.mock('../../utils/tlv', () => ({
  encodeTLV: jest.fn(() => Buffer.from([0xC1])),
  encodeInstance: jest.fn(() => Buffer.from([0xC2])),
  decodeTLV: jest.fn(() => ({ resourceId: 1, value: 42 })),
}));

describe('PayloadCodec', () => {
  describe('encode', () => {
    it('encodes text format', () => {
      const result = PayloadCodec.encode('hello', CONTENT_FORMATS.text);
      expect(result).toBe('hello');
    });

    it('encodes non-string to text format', () => {
      const result = PayloadCodec.encode(123, CONTENT_FORMATS.text);
      expect(result).toBe('123');
    });

    it('encodes JSON format', () => {
      const input = { key: 'value' };
      const result = PayloadCodec.encode(input, CONTENT_FORMATS.json);
      expect(result).toBe(JSON.stringify(input));
    });

    it('encodes CBOR format', () => {
      const result = PayloadCodec.encode({ key: 'value' }, CONTENT_FORMATS.cbor);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('encodes TLV single resource', () => {
      const result = PayloadCodec.encode({ resourceId: 1, value: 42 }, CONTENT_FORMATS.tlv);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('encodes TLV instance', () => {
      const payload = {
        instanceId: 0,
        resources: {
          0: { type: 'string', value: 'Test Manufacturer', readable: true },
          1: { type: 'integer', value: 123, readable: true }
        }
      };
      const result = PayloadCodec.encode(payload, CONTENT_FORMATS.tlv);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('throws error on invalid TLV input', () => {
      expect(() => {
        PayloadCodec.encode({ some: 'invalid' }, CONTENT_FORMATS.tlv);
      }).toThrow('Invalid TLV payload format');
    });

    it('throws error on missing format', () => {
      expect(() => {
        PayloadCodec.encode('data');
      }).toThrow('Content format is required for encoding.');
    });

    it('throws error on unknown format', () => {
      expect(() => {
        PayloadCodec.encode('data', 'unsupported/format');
      }).toThrow('Unsupported content format: unsupported/format');
    });
  });

  describe('decode', () => {
    it('decodes text format', () => {
      const buf = Buffer.from('hello');
      const result = PayloadCodec.decode(buf, CONTENT_FORMATS.text);
      expect(result).toBe('hello');
    });

    it('decodes JSON format', () => {
      const obj = { x: 1 };
      const buf = Buffer.from(JSON.stringify(obj));
      const result = PayloadCodec.decode(buf, CONTENT_FORMATS.json);
      expect(result).toEqual(obj);
    });

    it('decodes CBOR format', () => {
      const buf = Buffer.from([0xa1]);
      const result = PayloadCodec.decode(buf, CONTENT_FORMATS.cbor);
      expect(result).toEqual({ decoded: true });
    });

    it('decodes TLV format', () => {
      const buf = Buffer.from([0xc1]);
      const result = PayloadCodec.decode(buf, CONTENT_FORMATS.tlv);
      expect(result).toEqual({ resourceId: 1, value: 42 });
    });

    it('parses Core Link Format', () => {
      const input = '</3/0>;rt="oma.lwm2m",</1/0>;if="sensor"';
      const parsed = PayloadCodec.decode(Buffer.from(input), CONTENT_FORMATS.link);
      expect(parsed).toEqual([
        { path: '/3/0', attributes: { rt: 'oma.lwm2m' } },
        { path: '/1/0', attributes: { if: 'sensor' } },
      ]);
    });

    it('throws on unknown decode format', () => {
      expect(() => {
        PayloadCodec.decode(Buffer.from('data'), 'unsupported/format');
      }).toThrow('Unsupported content format for decoding: unsupported/format');
    });

    it('throws on missing decode format', () => {
      expect(() => {
        PayloadCodec.decode(Buffer.from('data'));
      }).toThrow('Content format is required for decoding.');
    });

    it('throws on malformed JSON', () => {
      expect(() => {
        PayloadCodec.decode(Buffer.from('{broken'), CONTENT_FORMATS.json);
      }).toThrow(/Failed to decode payload: .*JSON/i);
    });
  });
});
