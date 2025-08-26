const EventEmitter = require('events');

// Shared EventEmitter instance
const sharedEmitter = new EventEmitter();

module.exports = sharedEmitter;
