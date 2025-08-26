// test/client/temperature.test.js
global.$ = {};
$.logger = require('../../client/logger.js');

// Mock setInterval and clearInterval for testing
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

describe('Temperature Sensor', () => {
  let mockSetInterval;
  let mockClearInterval;
  let intervalCallback;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock setInterval to capture the callback
    mockSetInterval = jest.fn((callback, delay) => {
      intervalCallback = callback;
      return 'mock-interval-id';
    });
    
    mockClearInterval = jest.fn();
    
    global.setInterval = mockSetInterval;
    global.clearInterval = mockClearInterval;
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  test('should initialize with correct structure and start interval', () => {
    // Clear require cache to ensure fresh import
    delete require.cache[require.resolve('../../client/objects/temperature.js')];
    
    const temperature = require('../../client/objects/temperature.js');
    
    expect(temperature.id).toBe(3303);
    expect(temperature.instances).toHaveLength(1);
    expect(temperature.instances[0].resources[5700]).toBeDefined();
    expect(temperature.instances[0].resources[5700].name).toBe('Sensor Value');
    expect(temperature.instances[0].resources[5700].observable).toBe(true);
    
    // Check that setInterval was called
    expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  test('should update sensor value on interval', () => {
    // Clear require cache and import fresh
    delete require.cache[require.resolve('../../client/objects/temperature.js')];
    const temperature = require('../../client/objects/temperature.js');
    
    const sensorResource = temperature.instances[0].resources[5700];
    const originalValue = sensorResource.value;
    
    // Execute the interval callback
    if (intervalCallback) {
      intervalCallback();
      
      // Value should have changed (could be higher or lower)
      expect(sensorResource.value).not.toBe(originalValue);
      expect(typeof sensorResource.value).toBe('number');
    }
  });

  test('should have proper resource configuration', () => {
    delete require.cache[require.resolve('../../client/objects/temperature.js')];
    const temperature = require('../../client/objects/temperature.js');
    
    const resources = temperature.instances[0].resources;
    
    // Check all resource configurations
    expect(resources[5700]).toEqual(expect.objectContaining({
      name: 'Sensor Value',
      type: 'float',
      units: 'Celsius',
      readable: true,
      writable: false,
      observable: true
    }));
    
    expect(resources[5701]).toEqual(expect.objectContaining({
      name: 'Units',
      value: 'Celsius',
      type: 'string',
      readable: true,
      writable: false,
      observable: false
    }));
    
    expect(resources[5605]).toEqual(expect.objectContaining({
      name: 'Reset Min/Max',
      executable: true
    }));
  });
});