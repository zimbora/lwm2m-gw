// utils/payloadCodec.js
const { encodeResourcesToCBOR, decodeCBOR } = require('./cbor'); // CBOR utility
const { encodeInstance, encodeTLV, decodeTLV } = require('./tlv'); // TLV utility
const CONTENT_FORMATS = require('./contentFormats'); // Supported content formats

/**
 * Utility class to encode and decode payloads based on content formats.
 */
class PayloadCodec {
  /**
   * Encodes a payload based on the specified content format.
   * @param {any} payload - The payload to encode.
   * @param {string} format - The content format for encoding.
   * @returns {Buffer|string} Encoded payload.
   * @throws {Error} If the format is unsupported or encoding fails.
   */
  static encode(payload, format) {
    if (!format) {
      throw new Error('Content format is required for encoding.');
    }

    switch (format) {
      case CONTENT_FORMATS.text:
        if (typeof payload !== 'string') {
          return String(payload); // Convert payload to string
        }
        return payload;

      case CONTENT_FORMATS.json:
        return JSON.stringify(payload); // Convert payload to JSON

      case CONTENT_FORMATS.cbor:
        return encodeResourcesToCBOR(payload); // Encode payload as CBOR

      case CONTENT_FORMATS.tlv:
        if (
          typeof payload === 'object' &&
          payload.resourceId != null &&
          payload.value !== undefined
        ) {
          return encodeTLV(payload.resourceId, payload.value, payload.type || 'float');
        } else if (
          typeof payload === 'object' &&
          payload.instanceId != null &&
          typeof payload.resources === 'object'
        ) {
          return encodeInstance(payload.instanceId, payload.resources);
        } else {
          throw new Error('Invalid TLV payload format');
        }
        
      default:
        throw new Error(`Unsupported content format: ${format}`);
    }
  }

  /**
   * Decodes a payload based on the specified content format.
   * @param {Buffer|string} payload - The payload to decode.
   * @param {string} format - The content format for decoding.
   * @returns {any} Decoded payload.
   * @throws {Error} If the format is unsupported or decoding fails.
   */
  static decode(payload, format) {
    if (!format) {
      throw new Error('Content format is required for decoding.');
    }

    try {
      switch (format) {
        case CONTENT_FORMATS.link:
          return PayloadCodec.parseCoreLinkFormat(payload.toString());

        case CONTENT_FORMATS.text:
          return payload?.toString('utf8'); // Convert buffer to string

        case CONTENT_FORMATS.json:
          return JSON.parse(payload.toString('utf8')); // Parse JSON

        case CONTENT_FORMATS.cbor:
          return decodeCBOR(payload); // Decode CBOR

        case CONTENT_FORMATS.tlv:
          return decodeTLV(payload); // Decode TLV

        default:
          throw new Error(`Unsupported content format for decoding: ${format}`);
      }
    } catch (err) {
      throw new Error(`Failed to decode payload: ${err.message}`);
    }
  }

  /**
   * Parses a Core Link Format string into structured resources.
   * @param {string} coreString - The Core Link Format string.
   * @returns {Array<Object>} Parsed resources.
   */
  static parseCoreLinkFormat(coreString) {
    const entries = coreString.split(',');
    const resources = [];

    for (const entry of entries) {
      const match = entry.match(/^<([^>]+)>(.*)$/);
      if (!match) continue;

      const path = match[1];
      const attrString = match[2];
      const attributes = {};

      // Parse each ;key[=value] pair
      const parts = attrString.split(';').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const [key, val] = part.split('=');
        if (val === undefined) {
          attributes[key] = true;
        } else {
          // Remove quotes if present
          attributes[key] = val.replace(/^"|"$/g, '');
        }
      }

      resources.push({ path, attributes });
    }

    return resources;
  }
}

module.exports = PayloadCodec;