const security = require('./security');
const serverObj = require('./server');
const accessControl = require('./accessControl');
const device = require('./device');
const connectivity = require('./connectivityMonitoring');
const firmware = require('./firmwareUpdate');
const location = require('./location');
const temperature = require('./temperature');

function getObjectModule(objectId) {
  switch (parseInt(objectId)) {
    case 0: return security;
    case 1: return serverObj;
    case 2: return accessControl;
    case 3: return device;
    case 4: return connectivity;
    case 5: return firmware;
    case 6: return location;
    case 3303: return temperature;
    default: return null;
  }
}

function getResource(objectId, instanceId, resourceId) {
  const mod = getObjectModule(objectId);
  if (!mod?.instances || !mod.instances[instanceId]) return null;
  return mod?.instances?.[instanceId]?.resources[resourceId] || null;
}

function getResourceSet(objectId, instanceId) {
  const mod = getObjectModule(objectId);
  return mod?.instances?.[instanceId]?.resources || null;
}

module.exports = {
	getObjectModule,
  getResource,
  getResourceSet
};
