global.$ = {};
$.logger = require('../logger.js')

const { loadObjectsFromFile, getResource, getObjectModule, addInstance } = require('../objects');
const path = require('path');

// Load objects from configuration file
const configPath = path.join(__dirname, 'objects-config.json');

console.log('[Client] Loading objects from configuration file...');

try {
  const loadedCount = loadObjectsFromFile(configPath);
  console.log(`[Client] Successfully loaded ${loadedCount} objects from configuration`);
  
  // Demonstrate accessing loaded objects
  console.log('\n[Client] Testing loaded objects:');
  
  // Test Custom Sensor (3400)
  const sensorValue = getResource(3400, 0, 5700);
  if (sensorValue) {
    console.log(`- Custom Sensor Value: ${sensorValue.value} ${sensorValue.units}`);
  }
  
  // Test Light Control (3401)
  const lightState = getResource(3401, 0, 5850);
  if (lightState) {
    console.log(`- Light On/Off: ${lightState.value}`);
  }
  
  // Demonstrate modifying resource values
  console.log('\n[Client] Testing resource modifications:');
  
  // Modify the sensor value
  const sensorObj = getObjectModule(3400);
  if (sensorObj && sensorObj.instances[0]) {
    const oldValue = sensorObj.instances[0].resources[5700].value;
    sensorObj.instances[0].resources[5700].value = 30.2;
    console.log(`- Modified Custom Sensor: ${oldValue} -> ${sensorObj.instances[0].resources[5700].value}`);
  }
  
  // Turn on the light
  const lightObj = getObjectModule(3401);
  if (lightObj && lightObj.instances[0]) {
    const oldState = lightObj.instances[0].resources[5850].value;
    lightObj.instances[0].resources[5850].value = true;
    console.log(`- Modified Light State: ${oldState} -> ${lightObj.instances[0].resources[5850].value}`);
  }
  
  // Test adding new instances
  console.log('\n[Client] Testing instance creation:');
  try {
    const newInstanceId = addInstance(3401, 1);
    console.log(`- Created new Light Control instance: ${newInstanceId}`);
    
    // Verify the new instance
    const newLightState = getResource(3401, newInstanceId, 5850);
    if (newLightState) {
      console.log(`- New instance Light State: ${newLightState.value}`);
    }
  } catch (error) {
    console.error(`- Failed to create instance: ${error.message}`);
  }
  
  console.log('\n[Client] Objects import and modification test completed successfully!');
  
} catch (error) {
  console.error(`[Client] Failed to load objects: ${error.message}`);
  process.exit(1);
}