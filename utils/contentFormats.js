// Define supported content formats
const CONTENT_FORMATS = {
  text: 'text/plain',
  json: 'application/json',
  cbor: 'application/cbor',
  tlv: 'application/vnd.oma.lwm2m+tlv',
  link: 'application/link-format',

  // Numeric format codes
  0: 'text/plain',
  40: 'application/link-format',
  50: 'application/json',
  60: 'application/vnd.oma.lwm2m+tlv',
  61: 'application/vnd.oma.lwm2m+json',
  62: 'application/vnd.oma.lwm2m+cbor',
};

module.exports = CONTENT_FORMATS;
