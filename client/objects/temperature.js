// client/objects/temperature.js
var temperature = {
  id: 3303, // LwM2M Temperature Object ID
  instances: [
    {
      resources: {
        5700: { // Sensor Value
          name: 'Sensor Value',
          value: 20.0,
          type: 'float',
          units: 'Celsius',
          readable: true,
          writable: false,
          observable: true
        },
        5701: { // Units (optional)
          name: 'Units',
          value: 'Celsius',
          type: 'string',
          readable: true,
          writable: false,
          observable: false
        },
        5705: { // Min Measured Value
          name: 'Min Measured Value',
          value: 20.0,
          type: 'float',
          readable: true,
          writable: false,
          observable: true
        },
        5706: { // Max Measured Value
          name: 'Max Measured Value',
          value: 20.0,
          type: 'float',
          readable: true,
          writable: false,
          observable: true
        },
        5601: { // Min Range Value
          name: 'Min Range Value',
          value: -40.0,
          type: 'float',
          readable: true,
          writable: true
        },
        5602: { // Max Range Value
          name: 'Max Range Value',
          value: 85.0,
          type: 'float',
          readable: true,
          writable: true
        },
        5605: { // Reset Min and Max Measured Values
          name: 'Reset Min/Max',
          execute: () => {
            const current = temperature.resources[5700].value;
            temperature.resources[5705].value = current;
            temperature.resources[5706].value = current;
            console.log('[Client] Temperature min/max reset.');
          },
          executable: true
        }
      }
    }
  ]
};

// Simulate sensor updates every 1s

setInterval(() => {
  const delta = (Math.random() - 0.5) * 0.5;
  const newValue = parseFloat(
    (temperature.instances[0].resources[5700].value + delta).toFixed(2)
  );
  temperature.instances[0].resources[5700].value = newValue;

  // Update min/max values
  if (newValue < temperature.instances[0].resources[5705].value) {
    temperature.instances[0].resources[5705].value = newValue;
  }
  if (newValue > temperature.instances[0].resources[5706].value) {
    temperature.instances[0].resources[5706].value = newValue;
  }
}, 1000);

module.exports = temperature;
