# MQTT Request Handler for LwM2M Server

This module provides bidirectional MQTT communication for the LwM2M server, allowing external MQTT clients to send requests to LwM2M devices and receive responses.

## Features

- **Inbound Requests**: Handle MQTT requests and forward them to LwM2M devices
- **Outbound Responses**: Publish device responses back to MQTT topics
- **Method Support**: GET, PUT, POST, DELETE, DISCOVER, OBSERVE, CANCEL-OBSERVE
- **Error Handling**: Automatic error responses for failed requests
- **Configurable**: Flexible MQTT broker configuration

## MQTT Topic Structure

### Inbound Requests (MQTT → LwM2M Device)

```
{project}/requests/{endpoint}/{method}{path}
```

Examples:

- `lwm2m/requests/device1/GET/3/0/0` - Read device manufacturer
- `lwm2m/requests/device1/PUT/3303/0/5601` - Write temperature minimum range
- `lwm2m/requests/device1/POST/3/0/4` - Execute reboot
- `lwm2m/requests/device1/OBSERVE/3303/0/5700` - Start observing temperature
- `lwm2m/requests/device1/DISCOVER` - Discover available resources

### Outbound Responses (LwM2M Device → MQTT)

```
{project}/responses/{endpoint}/{method}{path}
```

Examples:

- `lwm2m/responses/device1/GET/3/0/0` - Response with manufacturer name
- `lwm2m/responses/device1/PUT/3303/0/5601` - Response confirming write operation
- `lwm2m/responses/device1/OBSERVE/3303/0/5700` - Response confirming observation started

### Device Data (Existing - unchanged)

```
{project}/{endpoint}/sensor{path}
```

Examples:

- `lwm2m/device1/sensor/3303/0/5700` - Temperature sensor data
- `lwm2m/device1/sensor/6/0/7` - Current timestamp

## Message Formats

### Request Message Format

Send requests as JSON payload:

```json
{
  "payload": "value_to_write_or_execute",
  "options": {
    "format": "json"
  }
}
```

**Supported format values:**

- `"text"` - Plain text format (default)
- `"json"` - JSON format
- `"cbor"` - CBOR binary format
- `"tlv"` - LwM2M TLV format
- `"link"` - Core Link format (used for discovery)

For simple operations, you can send plain text:

```
"simple_value"
```

### Response Message Format

Responses are always JSON:

```json
{
  "timestamp": 1699123456789,
  "endpoint": "device1",
  "method": "GET",
  "path": "/3/0/0",
  "data": "NodeCoAP Inc."
}
```

### Error Response Format

```json
{
  "timestamp": 1699123456789,
  "endpoint": "device1",
  "method": "GET",
  "path": "/3/0/0",
  "data": {
    "error": "Device not found"
  }
}
```

### Format Handling

The MQTT Request Handler supports different content formats for both sending requests to and receiving responses from LwM2M devices. The format is specified in the `options.format` field of the request message.

#### Sending Different Formats

**JSON Format:**

```json
{
  "payload": { "temperature": 25.5 },
  "options": { "format": "json" }
}
```

**CBOR Format (binary):**

```json
{
  "payload": { "sensor_data": [1, 2, 3] },
  "options": { "format": "cbor" }
}
```

**TLV Format (LwM2M specific):**

```json
{
  "payload": { "resourceId": 5700, "value": 25.5, "type": "float" },
  "options": { "format": "tlv" }
}
```

#### Receiving Different Formats

Responses from devices will be decoded according to the requested format. The decoded data is returned in the `data` field of the response message. The format affects how the device interprets incoming data and how responses are encoded/decoded.

## Usage

### Basic Usage

```javascript
const MqttRequestHandler = require('./server/mqttRequestHandler');

const handler = new MqttRequestHandler({
  project: 'lwm2m',
  host: 'localhost',
  port: 1883,
  username: 'user',
  password: 'pass',
  clientId: 'lwm2m-handler',
});

await handler.connect();
```

### Integration with Existing Gateway

```javascript
// server/examples/serverMqttBidirectional.js
const MqttRequestHandler = require('../mqttRequestHandler');

const mqttRequestHandler = new MqttRequestHandler({
  enabled: true,
  project: 'lwm2m',
  host: 'localhost',
  port: 1883,
});

await mqttRequestHandler.connect();
```

## Supported LwM2M Operations

| Method         | Description            | Example Topic                                       | Payload Required |
| -------------- | ---------------------- | --------------------------------------------------- | ---------------- |
| GET            | Read resource value    | `lwm2m/requests/device1/GET/3/0/0`                  | No               |
| PUT            | Write resource value   | `lwm2m/requests/device1/PUT/3/0/1`                  | Yes              |
| POST           | Execute resource       | `lwm2m/requests/device1/POST/3/0/4`                 | Optional         |
| DELETE         | Delete object instance | `lwm2m/requests/device1/DELETE/3/1`                 | No               |
| DISCOVER       | Discover resources     | `lwm2m/requests/device1/DISCOVER`                   | No               |
| OBSERVE        | Start observing        | `lwm2m/requests/device1/OBSERVE/3303/0/5700`        | No               |
| CANCEL-OBSERVE | Stop observing         | `lwm2m/requests/device1/CANCEL-OBSERVE/3303/0/5700` | No               |

## Configuration Options

```javascript
{
  enabled: true,        // Enable/disable the handler
  project: 'lwm2m',     // MQTT topic prefix
  host: 'localhost',    // MQTT broker host
  port: 1883,           // MQTT broker port
  username: '',         // MQTT username (optional)
  password: '',         // MQTT password (optional)
  clientId: 'handler'   // MQTT client ID
}
```

## Example MQTT Client Usage

### Using mosquitto_pub to send requests:

```bash
# Read device manufacturer (default text format)
mosquitto_pub -h localhost -t "lwm2m/requests/device1/GET/3/0/0" -m "{}"

# Read device info in JSON format
mosquitto_pub -h localhost -t "lwm2m/requests/device1/GET/3/0/0" -m '{"options": {"format": "json"}}'

# Write temperature threshold (plain text)
mosquitto_pub -h localhost -t "lwm2m/requests/device1/PUT/3303/0/5601" -m '{"payload": "-10.0"}'

# Write configuration in JSON format
mosquitto_pub -h localhost -t "lwm2m/requests/device1/PUT/3303/0/5601" -m '{"payload": {"threshold": -10.0}, "options": {"format": "json"}}'

# Write binary data in CBOR format
mosquitto_pub -h localhost -t "lwm2m/requests/device1/PUT/3303/0/5750" -m '{"payload": {"config": [1,2,3]}, "options": {"format": "cbor"}}'

# Execute reboot
mosquitto_pub -h localhost -t "lwm2m/requests/device1/POST/3/0/4" -m "{}"

# Start observing temperature in JSON format
mosquitto_pub -h localhost -t "lwm2m/requests/device1/OBSERVE/3303/0/5700" -m '{"options": {"format": "json"}}'
```

### Using mosquitto_sub to receive responses:

```bash
# Listen to all responses
mosquitto_sub -h localhost -t "lwm2m/responses/+/+/+"

# Listen to specific device responses
mosquitto_sub -h localhost -t "lwm2m/responses/device1/+/+"

# Listen to device data
mosquitto_sub -h localhost -t "lwm2m/device1/sensor/+"
```

## Error Handling

The handler provides automatic error handling:

1. **Invalid Topic Format**: Logs warning and ignores message
2. **Unsupported Method**: Returns error response to MQTT
3. **Device Communication Error**: Returns error response with details
4. **Missing Payload**: Returns error for operations requiring payload (PUT)

## Integration with Existing Code

The MQTT Request Handler is designed to work alongside the existing `serverMqttGw.js`. It:

- Uses the same LwM2M client functions (`getRequest`, `putRequest`, etc.)
- Shares the same configuration pattern
- Works with the existing event system
- Maintains backward compatibility with existing topic structure

## Testing

Run the test suite:

```bash
npm test test/server/mqttRequestHandler.test.js
```

The tests cover:

- Request parsing
- Method routing
- Configuration handling
- Error scenarios
