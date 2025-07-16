// client/objects/firmwareUpdate.js
module.exports = {
  id: 5,
  resources: {
    0: { name: 'Package', value: '', type: 'opaque', writable: true },
    1: { name: 'Package URI', value: '', type: 'string', writable: true },
    2: { name: 'Update', execute: () => console.log('[Client] Firmware update...'), executable: true },
    3: { name: 'State', value: 1, type: 'integer', readable: true, observable: true },
    5: { name: 'Update Result', value: 0, type: 'integer', readable: true, observable: true },
    6: { name: 'Firmware Version', value: 'v1.0.3', type: 'string', readable: true },
    7: { name: 'Protocol Support', value: ['CoAP'], type: 'string', readable: true }
  }
};

const firmware = module.exports;