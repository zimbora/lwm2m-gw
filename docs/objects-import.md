# Objects Import from File

This feature allows importing LwM2M objects from a JSON configuration file in `client/examples`, making them accessible through the standard LwM2M client API.

## Configuration File Format

Create a JSON file (e.g., `objects-config.json`) in the `client/examples` directory with the following structure:

```json
{
  "objects": [
    {
      "id": 3400,
      "name": "Custom Sensor",
      "instances": [
        {
          "instanceId": 0,
          "resources": {
            "5700": {
              "name": "Sensor Value",
              "value": 25.5,
              "type": "float",
              "units": "°C",
              "readable": true,
              "writable": false,
              "observable": true
            }
          }
        }
      ]
    }
  ]
}
```

## Resource Properties

Each resource can have the following properties:
- `name`: Human-readable name for the resource
- `value`: Initial value of the resource
- `type`: Data type (`integer`, `float`, `string`, `boolean`)
- `units`: Units for the resource value (optional)
- `readable`: Whether the resource can be read (default: true)
- `writable`: Whether the resource can be written (default: false)
- `observable`: Whether the resource can be observed (default: false)
- `executable`: Whether the resource can be executed (default: false)

## Usage

### Loading Objects

```javascript
const { loadObjectsFromFile } = require('../objects');
const path = require('path');

const configPath = path.join(__dirname, 'objects-config.json');
const loadedCount = loadObjectsFromFile(configPath);
console.log(`Loaded ${loadedCount} objects`);
```

### Accessing Resources

```javascript
const { getResource, getObjectModule } = require('../objects');

// Get a specific resource
const sensorValue = getResource(3400, 0, 5700);
console.log(`Sensor value: ${sensorValue.value} ${sensorValue.units}`);

// Get the entire object
const sensorObject = getObjectModule(3400);
```

### Modifying Resources

```javascript
// Direct modification
const sensorObject = getObjectModule(3400);
sensorObject.instances[0].resources[5700].value = 30.5;

// The change is immediately available to the LwM2M server
```

### Adding New Instances

```javascript
const { addInstance } = require('../objects');

// Add a new instance of object 3400
const newInstanceId = addInstance(3400, 1);
console.log(`Created instance: ${newInstanceId}`);
```

## Integration with LwM2M Client

Dynamically loaded objects are automatically:
- Included in discovery responses
- Accessible via CoAP GET/PUT/POST operations  
- Available for observation by LwM2M servers
- Compatible with all existing client functionality

## Examples

See the following example files:
- `objects-config.json` - Sample configuration file
- `objects-import-example.js` - Basic usage example
- `client-with-custom-objects.js` - Full client with custom objects

## Testing

Run the test suite:
```bash
npm test test/client/objects-import.test.js
```

This tests all functionality including loading, accessing, modifying, and error handling.