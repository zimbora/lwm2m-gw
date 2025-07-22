// client/objects/connectivityMonitoring.js
module.exports = {
  id: 4,
  instances:
  [
    {
      resources: {
        0: { name: 'Network Bearer', value: 0, type: 'integer', readable: true },
        1: { name: 'Available Network Bearer', value: [0, 3], type: 'opaque', readable: true },
        4: { name: 'IP Addresses', value: ['192.168.1.100'], type: 'string', readable: true, observable: true },
        5: { name: 'Router IP Addresses', value: ['192.168.1.1'], type: 'string', readable: true },
        6: { name: 'Link Quality', value: 70, type: 'integer', readable: true, observable: true },
        7: { name: 'Link Utilization', value: 45, type: 'integer', readable: true, observable: true },
        8: { name: 'APN', value: 'internet', type: 'string', readable: true, writable: true },
        10: { name: 'Cell ID', value: 21543, type: 'integer', readable: true },
        11: { name: 'SMNC', value: 10, type: 'integer', readable: true },
        12: { name: 'SMCC', value: 268, type: 'integer', readable: true }
      }
    }
  ]
};