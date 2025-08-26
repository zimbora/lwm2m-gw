// index.js

// server libs
const bootstrap = require('./server/bootstrap');
const resourceClient = require('./server/resourceClient');
const mqttRequestHandler = require('./server/mqttRequestHandler');
const clientRegistry = require('./server/clientRegistry');
const sharedEmitter = require('./server/transport/sharedEmitter');

// client libs
const resourceServer = require('./client/resourceServer');
const registration = require('./client/registration');
const logger = require('./client/logger');

// utils lib

const server = {
  bootstrap,
  resourceClient,
  mqttRequestHandler,
  clientRegistry,
  sharedEmitter,
};

const client = {
  resourceServer,
  registration,
  logger,
};

module.exports = {
  server,
  client,
};
