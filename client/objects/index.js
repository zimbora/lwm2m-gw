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

  if(objectId == null)
    return null;

  if(instanceId == null)
    instanceId = 0;

  if(!resourceId)
    return getResourceSet(objectId, instanceId);
  else
    return mod?.instances?.[instanceId]?.resources[resourceId] || null;
}

function getResourceSet(objectId, instanceId) {
  const mod = getObjectModule(objectId);
  return mod?.instances?.[instanceId]?.resources || null;
}

function addInstance(objectId, instanceId) {
  const mod = getObjectModule(objectId);
  if (!mod) {
    throw new Error(`Object ID ${objectId} not found`);
  }

  // If instanceId not provided, generate next available
  if (instanceId == null) {
    const existingIds = Object.keys(mod.instances || {}).map(id => parseInt(id));
    instanceId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;
  } else {
    instanceId = parseInt(instanceId);
  }

  // Initialize the instances object if it doesn't exist
  if (!mod.instances) {
    mod.instances = {};
  }

  if (mod.instances[instanceId]) {
    throw new Error(`Instance ${instanceId} already exists for object ${objectId}`);
  }

  // Check for instance 0
  const defaultInstanceId = 0;
  const defaultInstance = mod.instances[defaultInstanceId];

  let resources = {};

  if (defaultInstance && defaultInstance.resources) {
    // Deep copy resources and set values to null
    resources = Object.fromEntries(
      Object.entries(defaultInstance.resources).map(([key, resource]) => [
        key,
        { ...resource, value: null }
      ])
    );
  }

  // Create the new instance with the copied resources
  mod.instances[instanceId] = {
    resources
  };

  return instanceId;
}

module.exports = {
	getObjectModule,
  getResource,
  getResourceSet,
  addInstance
};
