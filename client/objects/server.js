// client/objects/server.js
module.exports = {
  id: 1,
  resources: {
    0: { name: 'Short Server ID', value: 123, type: 'integer', readable: true },
    1: { name: 'Lifetime', value: 300, type: 'integer', readable: true, writable: true },
    6: { name: 'Notification Storing When Offline', value: true, type: 'boolean', readable: true, writable: true },
    7: { name: 'Binding', value: 'U', type: 'string', readable: true },
    8: { name: 'Registration Update Trigger', execute: () => console.log('[Client] Manual update triggered'), executable: true }
  }
};