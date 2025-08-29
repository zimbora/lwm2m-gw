global.$ = {};
$.logger = require('../logger.js')

// Import the LwM2M client functionality  
const { startResourceServer } = require('../resourceServer');
const { registerToServer, updateRegistration, deregister } = require('../registration');
const { loadObjectsFromFile, getResource, getObjectModule, addInstance } = require('../objects');
const path = require('path');

const endpointName = 'node-client-with-custom-objects';
const serverHost = 'localhost';
const serverPort = 5683;
const localPort = 56831;

const RETRY_INTERVAL = 60*1000;
let updateTimer = null;

$.client = {};
$.client['registered'] = false;

// Load custom objects from configuration file
async function loadCustomObjects() {
  try {
    const configPath = path.join(__dirname, 'objects-config.json');
    const loadedCount = loadObjectsFromFile(configPath);
    $.logger.info(`Loaded ${loadedCount} custom objects from configuration`);
    
    // Set up periodic updates for custom sensor
    setInterval(() => {
      const sensorObj = getObjectModule(3400);
      if (sensorObj && sensorObj.instances[0]) {
        // Simulate temperature sensor reading
        const currentTemp = sensorObj.instances[0].resources[5700].value;
        const newTemp = parseFloat((currentTemp + (Math.random() - 0.5) * 2).toFixed(1));
        sensorObj.instances[0].resources[5700].value = newTemp;
        $.logger.debug(`Custom sensor value updated to: ${newTemp}°C`);
      }
    }, 5000);
    
    // Set up light control simulation
    setInterval(() => {
      const lightObj = getObjectModule(3401);
      if (lightObj && lightObj.instances[0]) {
        // Toggle light state
        const currentState = lightObj.instances[0].resources[5850].value;
        lightObj.instances[0].resources[5850].value = !currentState;
        $.logger.debug(`Light toggled to: ${lightObj.instances[0].resources[5850].value}`);
        
        // Update dimmer randomly
        lightObj.instances[0].resources[5851].value = Math.floor(Math.random() * 100);
      }
    }, 10000);
    
    return true;
  } catch (error) {
    $.logger.error(`Failed to load custom objects: ${error.message}`);
    return false;
  }
}

async function monitorServerConnection() {
  updateTimer = setInterval(async () => {
    if (!$.client.registered){
      try {
        $.logger.info('[Client] Attempting re-registration...');
        await registerToServer(endpointName, serverHost, serverPort, localPort);
        $.client.registered = true;
        monitorServerConnection(); // restart updates
      } catch (regErr) {
        $.logger.error(`[Client] Re-registration failed: ${regErr.message}`);
      }
      return;
    }else{
      try {
        await updateRegistration(serverHost, serverPort);
        $.logger.debug('[Client] Sent registration update.');
      } catch (err) {
        $.logger.error(`[Client] Lost connection to server during update: ${err.message}`);
        $.client.registered = false;

        $.logger.info('[Client] Attempting re-registration...');
        try {
          await registerToServer(endpointName, serverHost, serverPort, localPort);
          $.client.registered = true;
        } catch (regErr) {
          $.logger.error(`[Client] Re-registration failed: ${regErr.message}`);
        } 
      }
    }

  }, RETRY_INTERVAL);
}

// Main execution
(async () => {
  $.logger.info('Starting LwM2M client with custom objects...');
  
  // Load custom objects first
  const objectsLoaded = await loadCustomObjects();
  if (!objectsLoaded) {
    $.logger.error('Failed to load custom objects, exiting.');
    process.exit(1);
  }
  
  // Start resource server
  startResourceServer();
  
  try {
    // Register to remote LwM2M server
    await registerToServer(endpointName, serverHost, serverPort, localPort);
    $.client.registered = true;
    $.logger.info('Client registered successfully with custom objects');
    
    // Show loaded resources
    $.logger.info('Available custom resources:');
    $.logger.info('- /3400/0/5700 (Custom Sensor Value)');
    $.logger.info('- /3401/0/5850 (Light On/Off)');
    $.logger.info('- /3401/0/5851 (Light Dimmer)');
    
  } catch (error) {
    $.logger.error(error);
  }
    
})();

// Start connection monitoring
monitorServerConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  $.logger.info('Shutting down client...');
  try {
    if ($.client.registered) {
      await deregister(serverHost, serverPort);
      $.logger.info('Client deregistered successfully');
    }
  } catch (error) {
    $.logger.error(`Error during deregistration: ${error.message}`);
  }
  process.exit(0);
});