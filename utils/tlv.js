// utils/tlv.js

function encodeTLV(resourceId, value, type = 'float') {
  let valueBuf;

  switch (type) {
    case 'float':
      valueBuf = Buffer.alloc(4);
      valueBuf.writeFloatBE(parseFloat(value), 0);
      break;

    case 'double':
      valueBuf = Buffer.alloc(8);
      valueBuf.writeDoubleBE(parseFloat(value), 0);
      break;

    case 'string':
      valueBuf = Buffer.from(value, 'utf8');
      break;

    case 'boolean':
      valueBuf = Buffer.from([value ? 1 : 0]);
      break;

    case 'integer': {
      const intVal = parseInt(value);
      if (intVal >= -128 && intVal <= 127) {
        valueBuf = Buffer.alloc(1);
        valueBuf.writeInt8(intVal);
      } else if (intVal >= -32768 && intVal <= 32767) {
        valueBuf = Buffer.alloc(2);
        valueBuf.writeInt16BE(intVal);
      } else {
        valueBuf = Buffer.alloc(4);
        valueBuf.writeInt32BE(intVal);
      }
      break;
    }

    case 'unsigned': {
      const uintVal = parseInt(value);
      if (uintVal <= 0xff) {
        valueBuf = Buffer.from([uintVal]);
      } else if (uintVal <= 0xffff) {
        valueBuf = Buffer.alloc(2);
        valueBuf.writeUInt16BE(uintVal);
      } else {
        valueBuf = Buffer.alloc(4);
        valueBuf.writeUInt32BE(uintVal);
      }
      break;
    }

    case 'opaque': {
      if (Buffer.isBuffer(value)) {
        valueBuf = value;
      } else if (typeof value === 'string') {
        valueBuf = Buffer.from(value, 'hex'); // assume hex string
      } else {
        throw new Error('Opaque type must be a Buffer or hex string');
      }
      break;
    }

    case 'time': {
      const ts = Math.floor(new Date(value).getTime() / 1000); // to Unix seconds
      valueBuf = Buffer.alloc(4);
      valueBuf.writeInt32BE(ts);
      break;
    }

    default:
      throw new Error(`Unsupported TLV type: ${type}`);
  }

  const length = valueBuf.length;
  let headerByte = 0b11000000;

  const idBuf =
    resourceId < 256
      ? Buffer.from([resourceId])
      : Buffer.from([(resourceId >> 8) & 0xff, resourceId & 0xff]);

  if (resourceId > 255) {
    headerByte |= 0b00100000;
  }

  let lengthBuf = Buffer.alloc(0);
  if (length < 8) {
    headerByte |= length;
  } else if (length < 256) {
    headerByte |= 0b00001000;
    lengthBuf = Buffer.from([length]);
  } else if (length < 65536) {
    headerByte |= 0b00010000;
    lengthBuf = Buffer.alloc(2);
    lengthBuf.writeUInt16BE(length);
  } else {
    headerByte |= 0b00011000;
    lengthBuf = Buffer.alloc(3);
    lengthBuf.writeUIntBE(length, 0, 3);
  }

  const headerBuf = Buffer.from([headerByte]);
  return Buffer.concat([headerBuf, idBuf, lengthBuf, valueBuf]);
}

function encodeInstance(instanceId, resources) {
  const resourceTLVs = Object.entries(resources)
    .filter(([_, r]) => r.readable && 'value' in r)
    .map(([id, r]) => encodeTLV(parseInt(id), r.value, r.type));

  const content = Buffer.concat(resourceTLVs);

  const header = Buffer.alloc(2);
  header[0] = 0b00000000; // Object Instance
  header[1] = instanceId;

  return Buffer.concat([header, content]);
}

function decodeTLV(buffer, typeMap = {}) {
  const resources = {};
  let offset = 0;

  while (offset < buffer.length) {
    const type = buffer[offset++];
    const is16bitId = (type & 0b00100000) !== 0;
    const lengthType = (type >> 3) & 0b11;
    const idLength = is16bitId ? 2 : 1;

    if (offset + idLength > buffer.length) {
      throw new Error('Buffer too short to read Resource ID');
    }

    const id = is16bitId ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += idLength;

    let length;
    if ((type & 0b00000111) <= 7) {
      const lenField = type & 0b00000111;
      if (lengthType === 0) {
        length = lenField;
      } else if (lengthType === 1) {
        length = buffer[offset++];
      } else if (lengthType === 2) {
        length = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (lengthType === 3) {
        length =
          (buffer[offset] << 16) |
          (buffer[offset + 1] << 8) |
          buffer[offset + 2];
        offset += 3;
      }
    }

    if (offset + length > buffer.length) {
      throw new Error(
        `Declared TLV value length (${length}) exceeds buffer size`
      );
    }

    const value = buffer.slice(offset, offset + length);
    offset += length;

    let decodedValue;
    const resourceType = typeMap[id];

    try {
      switch (resourceType) {
        case 'float':
          decodedValue = value.readFloatBE();
          break;
        case 'double':
          decodedValue = value.readDoubleBE();
          break;
        case 'integer':
          decodedValue = value.readIntBE(0, length);
          break;
        case 'unsigned':
          decodedValue = value.readUIntBE(0, length);
          break;
        case 'string':
          decodedValue = value.toString('utf8');
          break;
        case 'boolean':
          decodedValue = value[0] !== 0;
          break;
        case 'opaque':
          decodedValue = value;
          break;
        case 'time':
          decodedValue = value.readInt32BE(); // seconds since epoch
          break;
        default:
          // Fallback
          if (length === 4) {
            decodedValue = value.readFloatBE();
          } else if (value.every((b) => b >= 32 && b <= 126)) {
            decodedValue = value.toString('utf8');
          } else if (length <= 6) {
            decodedValue = value.readUIntBE(0, length);
          } else {
            decodedValue = value;
          }
      }
    } catch (err) {
      throw new Error(
        `Failed to decode TLV value for resource ${id}: ${err.message}`
      );
    }

    resources[id] = decodedValue;
  }

  return resources;
}

module.exports = { encodeTLV, encodeInstance, decodeTLV };
