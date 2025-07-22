// client/objects/security.js
module.exports = {
  id: 0,
  instances:
  [
    {
      resources: {
        0: { name: 'LwM2M Server URI', value: 'coap://localhost:5683', type: 'string', readable: true },
        1: { name: 'Bootstrap Server', value: false, type: 'boolean', readable: true },
        2: { name: 'Security Mode', value: 3, type: 'integer', readable: true }, // 3 = NoSec
        10: { name: 'Short Server ID', value: 123, type: 'integer', readable: true },
        16: { name: 'SMSSecurityMode', value: 0, type: 'integer', readable: true }
      }
    }
  ]
};
