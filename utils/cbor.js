// utils/cbor.js
const cbor = require('cbor');

function encodeResourcesToCBOR(resources) {
  const obj = {};

  for (const [id, r] of Object.entries(resources)) {
    if ('value' in r) {
      obj[id] = r.value;
    }
  }

  return cbor.encode(obj);
}

async function decodeCBOR(buffer, typeMap = {}) {
  try {
    const decoded = await cbor.decodeFirst(buffer);

    // If you expect a map of resources:
    for (const [key, val] of Object.entries(decoded)) {
      if (typeMap[key] === 'time' && typeof val === 'string') {
        decoded[key] = Math.floor(new Date(val).getTime() / 1000);
      }
    }

    return decoded;
  } catch (err) {
    throw new Error('Invalid CBOR payload: ' + err.message);
  }
}

module.exports = { encodeResourcesToCBOR, decodeCBOR };