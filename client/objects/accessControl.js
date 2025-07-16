// client/objects/accessControl.js
module.exports = {
  id: 2,
  resources: {
    0: { name: 'Object ID', value: 3, type: 'integer', readable: true },
    1: { name: 'Object Instance ID', value: 0, type: 'integer', readable: true },
    2: { name: 'ACL', value: 'RW', type: 'string', readable: true, writable: true },
    3: { name: 'Access Control Owner', value: 1, type: 'integer', readable: true, writable: true },
    4: { name: 'Owner', value: 123, type: 'integer', readable: true }
  }
}