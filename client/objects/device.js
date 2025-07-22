// client/objects/device.js
module.exports = {
  id: 3,
  instances: 
  [ 
    {
      resources: {
        0: { name: 'Manufacturer', value: 'NodeCoAP Inc.', type: 'string', readable: true },
        1: { name: 'Model Number', value: 'NC-01', type: 'string', readable: true },
        2: { name: 'Reboot', execute: () => console.log('[Client] Rebooting...'), executable: true },
        3: { name: 'Serial Number', value: '1234567890', type: 'string', readable: true },
        9: { name: 'Battery Level', value: () => Math.floor(Math.random() * 100), type: 'integer', readable: true, observable: true, units: '%' },
        10: { name: 'Memory Free', value: () => Math.floor(Math.random() * 5000), type: 'integer', readable: true, observable: true, units: 'KB' },
        13: { name: 'Current Time', value: () => new Date().toISOString(), type: 'time', readable: true, observable: true },
        14: { name: 'UTC Offset', value: '+00:00', type: 'string', readable: true },
        15: { name: 'Timezone', value: 'UTC', type: 'string', readable: true },
        16: { name: 'Supported Binding and Modes', value: 'U', type: 'string', readable: true }
      }  
    }
  ]
};