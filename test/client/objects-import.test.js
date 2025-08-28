// test/client/objects-import.test.js
global.$ = {};
$.logger = require('../../client/logger.js');

const { loadObjectsFromFile, getResource, getObjectModule, addInstance, getDynamicObjects } = require('../../client/objects');
const fs = require('fs');
const path = require('path');

describe('Objects Import from File', () => {
  const testConfigPath = path.join(__dirname, 'test-objects-config.json');
  
  beforeAll(() => {
    // Create a test configuration file
    const testConfig = {
      "objects": [
        {
          "id": 9999,
          "name": "Test Object",
          "instances": [
            {
              "instanceId": 0,
              "resources": {
                "1000": {
                  "name": "Test Resource",
                  "value": 42,
                  "type": "integer",
                  "readable": true,
                  "writable": true,
                  "observable": true
                }
              }
            }
          ]
        }
      ]
    };
    
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  });
  
  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  test('should load objects from configuration file', () => {
    const loadedCount = loadObjectsFromFile(testConfigPath);
    expect(loadedCount).toBe(1);
  });

  test('should make loaded objects accessible via getObjectModule', () => {
    const testObj = getObjectModule(9999);
    expect(testObj).toBeTruthy();
    expect(testObj.id).toBe(9999);
    expect(testObj.name).toBe('Test Object');
  });

  test('should make loaded resources accessible via getResource', () => {
    const testResource = getResource(9999, 0, 1000);
    expect(testResource).toBeTruthy();
    expect(testResource.name).toBe('Test Resource');
    expect(testResource.value).toBe(42);
    expect(testResource.type).toBe('integer');
  });

  test('should allow resource value modification', () => {
    const testObj = getObjectModule(9999);
    const originalValue = testObj.instances[0].resources[1000].value;
    
    // Modify the resource value
    testObj.instances[0].resources[1000].value = 100;
    
    // Verify the modification
    const updatedResource = getResource(9999, 0, 1000);
    expect(updatedResource.value).toBe(100);
    expect(updatedResource.value).not.toBe(originalValue);
  });

  test('should allow adding new instances', () => {
    const newInstanceId = addInstance(9999, 1);
    expect(newInstanceId).toBe(1);
    
    // Verify the new instance exists
    const newInstanceResource = getResource(9999, 1, 1000);
    expect(newInstanceResource).toBeTruthy();
    expect(newInstanceResource.value).toBeNull(); // New instances should have null values
  });

  test('should return dynamic objects via getDynamicObjects', () => {
    const dynamicObjects = getDynamicObjects();
    expect(dynamicObjects).toBeTruthy();
    expect(dynamicObjects[9999]).toBeTruthy();
  });

  test('should handle missing configuration file', () => {
    expect(() => {
      loadObjectsFromFile('/nonexistent/path/config.json');
    }).toThrow('Objects configuration file not found');
  });

  test('should handle invalid JSON configuration', () => {
    const invalidConfigPath = path.join(__dirname, 'invalid-config.json');
    fs.writeFileSync(invalidConfigPath, 'invalid json content');
    
    expect(() => {
      loadObjectsFromFile(invalidConfigPath);
    }).toThrow('Failed to load objects from file');
    
    // Clean up
    fs.unlinkSync(invalidConfigPath);
  });
});