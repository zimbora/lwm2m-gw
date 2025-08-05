
# LwM2M Node.js Library

A comprehensive **Lightweight Machine to Machine (LwM2M)** implementation in Node.js featuring both client and server components with support for CoAP, DTLS encryption, and full bootstrap capabilities.

## ⚡ Quick Demo

### Complete Bootstrap Workflow

Experience the full LwM2M lifecycle from device provisioning to operation:

#### 1. Launch Bootstrap Server
```bash
node server/bootstrapServer.js | npx pino-pretty
```
*Handles device provisioning and security configuration on port 5684*

#### 2. Launch Main LwM2M Server
```bash
node server/server.js | npx pino-pretty
```
*Manages registered devices and resource operations on port 5683*

#### 3. Launch Bootstrap Client
```bash
node client/bootstrapClient.js | npx pino-pretty
```
*Simulates a device going through the complete bootstrap process*

#### 4. Launch Standard Client
```bash
node client/client.js | npx pino-pretty
```
*Simulates a pre-configured device connecting directly*

### 🔄 What Happens

The bootstrap client automatically:
1. **Connects** to bootstrap server (port 5684)
2. **Receives** security and server configuration objects
3. **Registers** to main LwM2M server (port 5683) 
4. **Begins** normal LwM2M operations (observations, resource access)

### 🔒 Secure Demo (DTLS)

For encrypted communication:

```bash
# Generate certificates
openssl ecparam -name secp256r1 -genkey -noout -out ecdsa.key
openssl req -x509 -new -key ecdsa.key -out ecdsa.crt -days 365 \
  -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"

# Launch secure server
node server/examples/dtlsServer.js
```

## 🌟 Key Features

- **📱 Complete LwM2M Implementation**: Full client and server with all standard objects
- **🔐 Security First**: DTLS encryption and comprehensive bootstrap provisioning  
- **🚀 Production Ready**: Event-driven architecture with monitoring and analytics
- **🔧 Developer Friendly**: Extensive examples, tests, and documentation
- **📊 Multiple Formats**: Support for JSON, CBOR, TLV, and text data formats
- **🔄 Real-time**: Resource observations and asynchronous notifications

---

## ✅ LwM2M Node.js Capabilities Overview

| Feature                              | 🌐 Client                         | 🖥️ Server                           | ✅ Auto Tests   |
|--------------------------------------|-----------------------------------|-------------------------------------|-----------------|
| **Bootstrap Server**                 |                                   |                                     |                 |
| Bootstrap Request Handling           | ✅ Supports bootstrap requests   | ✅ Handles `/bs` endpoint           | ✅ Covered      |
| Security Object Provisioning        | ✅ Receives provisioned config   | ✅ Creates security instances       | ✅ Covered      |
| Server Object Provisioning          | ✅ Receives provisioned config   | ✅ Creates server instances         | ✅ Covered      |
| Bootstrap Finish                     | ✅ Sends finish notification     | ✅ Handles `/bs-finish` endpoint    | ✅ Covered      |
| Configuration Management             | 🕐 Planned                        | ✅ Per-endpoint configuration       | 🟡 Partial      |
|                                      |                                   |                                     |                 |
| **Server**                           |                                   |                                     |                 |
| LwM2M Registration (`/rd`)           | ✅ Sends registration             | ✅ Handles registration             | ✅ Covered	   |
| Registration Update (`/rd/{id}`)     | ✅ Supports                       | ✅ Handles update                   | ✅ Covered      |
| Deregistration                       | ✅ Sends                          | ✅ Handles deregistration           | ✅ Covered      |
| Error Detection / Retry              | ✅ Logs failures                  | ✅ Detects connection loss          | 🛑 Not Covered  |
| Event-Driven Responses               | 🕐 Planned                        | ✅ Emits payload per request        | 🟡 server       |
|                                      |                                   |                                     |                 |
| **Object Model / Discovery**         |                                   |                                     |                 |
| Built-in Objects (0–6 + 3303)        | ✅ Fully implemented              | 🕐 Used via client introspection    | 🛑 Not Covered  |
| Well-Known Core Discovery            | ✅ Responds with `</x/y/z>;attr`  | ✅ Parses and lists resources       | 🟡 server       |
| Resource Metadata (R/W/X/Obs/Units)  | ✅ Defined per object             | ✅ Discoverable via `/core`         | 🛑 Not Covered  |
| Multiple Instances                   | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Resource Access**                  |                                   |                                     |                 |
| Resource Read                        | ✅ Responds with value            | ✅ Sends GET request                | ✅ Covered      |
| Resource Write                       | ✅ Accepts PUT                    | ✅ Sends PUT                        | ✅ Covered      |
| Resource Execute                     | ✅ Handles function call          | ✅ Sends POST                       | ✅ Covered      |
| Resource Observation                 | ✅ Manages and sends notifications| ✅ Sends GET with Observe=0         | ✅ Covered      |
| Resource Write attribute             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstanceId Create             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstaceId Delete              | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Manual Notification Push             | ✅ Interval-based observe         | ✅ Receives notifications           | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Data Formats**                     |                                   |                                     |                 |
| Text Format (`Content-Format: 0`)    | ✅ Default/fallback               | ✅ Default/fallback                 | ✅ Covered      |
| Link Format (`Content-Format: 40`)   | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
| JSON Format (`Content-Format: 50`)   | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
| TLV LwM2M (`Content-Format: 60`)     | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode                    | ✅ Covered      |
| JSON LwM2M (`Content-Format: 61`)    | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode                    | ✅ Covered      |
| CBOR LwM2M (`Content-Format: 62`)    | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
|                                      |                                   |                                     |                 |
| **Transport Layers**                 |                                   |                                     |                 |
| COAP                                 | ✅ Default                        | ✅ Default                          | 🛑 Not Covered  |
| MQTT                                 | ⚠️ untested                       | ⚠️ untested                         | 🛑 Not Covered  |
| Bridge COAP/MQTT                     | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Fota**                             |                                   |                                     |                 |
| UDP                                  | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
| HTTP                                 | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Extra Features**                   |                                   |                                     |                 |
| Object 3303 Temperature (Simulated)  | ✅ Periodic updates               | ✅ Observes value                   | 🛑 Not Covered  |
| Security: DTLS, OSCORE               | 🛑 OSCORE not yet                | ✅ DTLS implemented                 | 🛑 Not Covered  |
| Persistant Storage                   | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |


---

## 🔒 DTLS Security (Server-Side)

This library implements **DTLS (Datagram Transport Layer Security)** for secure CoAP communication on the server side. DTLS provides encryption, authentication, and message integrity for LwM2M communications.

### Features

- ✅ **Certificate-based Authentication**: X.509 certificate support
- ✅ **Encrypted Communication**: All CoAP messages encrypted via DTLS
- ✅ **Standard Port Support**: Uses CoAPS port 5684
- ✅ **Full LwM2M Protocol Support**: Registration, updates, observations, and resource operations over DTLS

### Quick Start

#### 1. Generate SSL Certificates

```bash
# Generate ECDSA private key
openssl ecparam -name secp256r1 -genkey -noout -out ecdsa.key

# Generate self-signed certificate
openssl req -x509 -new -key ecdsa.key -out ecdsa.crt -days 365 \
  -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"
```

#### 2. Start DTLS Server

```javascript
const { startLwM2MDTLSCoapServer } = require('./server/resourceClient');

// Validation function for client registration
const validation = (ep, payload) => {
  console.log(`Validating client: ${ep}`);
  return Promise.resolve(true);
};

// DTLS server options
const options = {
  port: 5684,              // Standard CoAPS (DTLS) port
  keyPath: './ecdsa.key',   // Path to private key
  certPath: './ecdsa.crt',  // Path to certificate
};

// Start the secure server
const server = startLwM2MDTLSCoapServer(validation, options);
```

#### 3. Run Example DTLS Server

```bash
node server/examples/dtlsServer.js
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 5684 | DTLS server port (standard CoAPS) |
| `keyPath` | string | './server.key' | Path to RSA/ECDSA private key |
| `certPath` | string | './server.crt' | Path to X.509 certificate |

### Supported Operations

All standard LwM2M operations are supported over DTLS:

- **Registration**: `/rd` endpoint with encrypted client information
- **Registration Update**: `/rd/{location}` with secure updates
- **Deregistration**: Secure client disconnection
- **Resource Operations**: GET, PUT, POST operations on resources
- **Observations**: Encrypted notification delivery
- **Bootstrap**: Secure provisioning of client configurations

### Security Considerations

- **Certificate Management**: Use proper CA-signed certificates in production
- **Key Protection**: Secure private key storage and access control
- **Client Authentication**: Implement proper client certificate validation
- **Regular Updates**: Keep certificates current and rotate keys periodically

### Events

DTLS server emits the same events as the standard CoAP server:

```javascript
const sharedEmitter = require('./server/transport/sharedEmitter');

sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(`[${protocol}] Client ${ep} registered at ${location}`);
});

sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[${protocol}] Client ${ep} updated registration`);
});

sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[${protocol}] Client ${ep} deregistered`);
});
```

---

## 🚀 Bootstrap Server Details

The Bootstrap Server is a critical component that provides initial configuration and security provisioning for LwM2M devices. It follows the OMA LwM2M specification for bootstrap procedures.

### Core Bootstrap Workflow

```
1. [Client] ──── POST /bs?ep=device-id ────► [Bootstrap Server]
2. [Client] ◄─── Delete Security Objects ─── [Bootstrap Server]  
3. [Client] ◄─── Delete Server Objects ───── [Bootstrap Server]
4. [Client] ◄─── Write Security Instance ─── [Bootstrap Server]
5. [Client] ◄─── Write Server Instance ───── [Bootstrap Server]
6. [Client] ──── POST /bs-finish ──────────► [Bootstrap Server]
7. [Client] ──── Register to LwM2M Server ─► [Main LwM2M Server]
```

### Bootstrap Objects

#### Security Object (ID: 0)
Provisioned with server connection details:

```javascript
{
  instanceId: 0,
  serverUri: 'coap://localhost:5683',  // Main LwM2M server URI
  isBootstrap: false,                  // This is for main server
  securityMode: 3,                     // 0=PSK, 1=RPK, 2=Cert, 3=NoSec
  shortServerId: 123,                  // Server ID reference
  publicKey: 'client-identity',        // PSK identity or certificate
  secretKey: 'shared-secret'           // PSK key or private key
}
```

#### Server Object (ID: 1)
Operational parameters for the main server:

```javascript
{
  instanceId: 0,
  shortServerId: 123,                  // Must match Security Object
  lifetime: 300,                       // Registration lifetime (seconds)
  binding: 'U',                        // UDP binding
  notificationStoring: true            // Store notifications when offline
}
```

### Bootstrap Configuration

#### Per-Device Configuration

```javascript
const { setBootstrapConfiguration } = require('./server/handleBootstrap');

// Configure specific device
setBootstrapConfiguration('device-001', {
  securityInstances: [{
    instanceId: 0,
    serverUri: 'coaps://production-server.com:5684',
    isBootstrap: false,
    securityMode: 2,  // Certificate-based security
    shortServerId: 999,
    publicKey: 'device-001-cert.pem',
    secretKey: 'device-001-key.pem'
  }],
  serverInstances: [{
    instanceId: 0,
    shortServerId: 999,
    lifetime: 3600,    // 1 hour lifetime
    binding: 'U',
    notificationStoring: true
  }]
});
```

#### Bulk Configuration

```javascript
// Configure multiple devices with similar settings
const devices = ['device-001', 'device-002', 'device-003'];
devices.forEach(deviceId => {
  setBootstrapConfiguration(deviceId, {
    securityInstances: [{
      instanceId: 0,
      serverUri: 'coap://fleet-server.example.com:5683',
      isBootstrap: false,
      securityMode: 1,  // PSK mode
      shortServerId: 100,
      publicKey: deviceId,
      secretKey: generatePSK(deviceId)  // Your PSK generation logic
    }],
    serverInstances: [{
      instanceId: 0,
      shortServerId: 100,
      lifetime: 86400,  // 24 hours
      binding: 'U',
      notificationStoring: true
    }]
  });
});
```

### Bootstrap Server Events

Monitor bootstrap process with detailed events:

```javascript
const sharedEmitter = require('./server/transport/sharedEmitter');

// Client requested bootstrap
sharedEmitter.on('bootstrap-request', ({ protocol, ep }) => {
  console.log(`Bootstrap requested by ${ep} via ${protocol}`);
  // Log for security monitoring
  // Update device status in database
});

// Client completed bootstrap
sharedEmitter.on('bootstrap-finish', ({ protocol, ep }) => {
  console.log(`Bootstrap completed for ${ep}`);
  // Mark device as ready for operations
  // Trigger any post-bootstrap actions
});
```

### Security Modes

| Mode | Value | Description | Use Case |
|------|--------|-------------|----------|
| PSK | 0 | Pre-Shared Key | Simple deployments, shared secrets |
| RPK | 1 | Raw Public Key | Certificate-less PKI |
| Certificate | 2 | X.509 Certificates | Full PKI infrastructure |
| NoSec | 3 | No Security | Development, testing only |

### Production Deployment

#### Security Best Practices

```javascript
// Production bootstrap configuration
const productionConfig = {
  securityInstances: [{
    instanceId: 0,
    serverUri: 'coaps://lwm2m.yourcompany.com:5684',
    isBootstrap: false,
    securityMode: 2,  // Use certificates in production
    shortServerId: 1,
    publicKey: './certs/device-cert.pem',
    secretKey: './certs/device-key.pem'
  }],
  serverInstances: [{
    instanceId: 0,
    shortServerId: 1,
    lifetime: 3600,      // Reasonable lifetime
    binding: 'U',
    notificationStoring: true
  }]
};
```

#### Monitoring and Logging

```javascript
// Enhanced bootstrap logging
sharedEmitter.on('bootstrap-request', ({ protocol, ep, timestamp }) => {
  // Security logging
  auditLog.info('Bootstrap attempt', {
    endpoint: ep,
    protocol: protocol,
    timestamp: timestamp,
    sourceIp: req.connection.remoteAddress
  });
  
  // Rate limiting check
  if (isRateLimited(ep)) {
    throw new Error('Too many bootstrap attempts');
  }
});
```

---

## Usage

## Usage

### Standard LwM2M Server

Start a basic CoAP server for device registration and management:

```javascript
const { startLwM2MCoapServer } = require('./server/resourceClient');

// Validation function for client registration
const validation = (ep, payload) => {
  console.log(`Registering device: ${ep}`);
  // Add custom validation logic here
  return Promise.resolve(true);
};

// Start server on default port 5683
const server = startLwM2MCoapServer(validation);
```

Or run the example server:

```bash
node server/server.js | npx pino-pretty
```

### Bootstrap-Enabled Deployment

For production deployments with device provisioning:

```bash
# Terminal 1: Start Bootstrap Server
node server/bootstrapServer.js | npx pino-pretty

# Terminal 2: Start Main LwM2M Server  
node server/server.js | npx pino-pretty

# Terminal 3: Start Bootstrap Client
node client/bootstrapClient.js | npx pino-pretty
```

### Secure DTLS Deployment

For encrypted communication:

```bash
# Generate certificates first
openssl ecparam -name secp256r1 -genkey -noout -out ecdsa.key
openssl req -x509 -new -key ecdsa.key -out ecdsa.crt -days 365 \
  -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=localhost"

# Start DTLS server
node server/examples/dtlsServer.js
```

### Client Operations

#### Resource Discovery

```bash
# Discover available resources
coap-cli get coap://localhost:5683/.well-known/core
```

#### Resource Operations

```javascript
const { sendCoapRequest } = require('./server/transport/coapClient');

// Read device manufacturer (Object 3, Instance 0, Resource 0)
const response = await sendCoapRequest('localhost', 5683, 'GET', '/3/0/0');
console.log('Manufacturer:', response.payload.toString());

// Write firmware update URL (Object 5, Instance 0, Resource 1)
await sendCoapRequest('localhost', 5683, 'PUT', '/5/0/1', {
  payload: Buffer.from('https://example.com/firmware.bin')
});

// Execute firmware update (Object 5, Instance 0, Resource 2)
await sendCoapRequest('localhost', 5683, 'POST', '/5/0/2');
```

#### Observations

```javascript
// Start observing a resource
await sendCoapRequest('localhost', 5683, 'GET', '/3303/0/5700', {
  observe: true,
  confirmable: true
});

// Listen for notifications
const sharedEmitter = require('./server/transport/sharedEmitter');
sharedEmitter.on('notification', ({ ep, path, payload }) => {
  console.log(`${ep} ${path}: ${payload.toString()}`);
});
```

### Event Monitoring

Monitor all LwM2M server events:

```javascript
const sharedEmitter = require('./server/transport/sharedEmitter');

// Device lifecycle events
sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(`[${protocol}] Device ${ep} registered at ${location}`);
});

sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[${protocol}] Device ${ep} updated registration`);
});

sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[${protocol}] Device ${ep} disconnected`);
});

// Resource events
sharedEmitter.on('notification', ({ protocol, ep, path, payload }) => {
  console.log(`[${protocol}] ${ep} notification ${path}: ${payload.toString()}`);
});

// Bootstrap events
sharedEmitter.on('bootstrap-request', ({ protocol, ep }) => {
  console.log(`[${protocol}] Bootstrap requested by ${ep}`);
});

sharedEmitter.on('bootstrap-finish', ({ protocol, ep }) => {
  console.log(`[${protocol}] Bootstrap completed for ${ep}`);
});
```

### Resource Server (Client-Side)

For device simulation and testing:

```javascript
const { startResourceServer } = require('./client/resourceServer');

// Start client resource server with temperature sensor simulation
const server = startResourceServer(56831);

// Server automatically provides:
// - Device object (ID 3) with manufacturer, model, etc.
// - Connectivity monitoring (ID 4) 
// - Temperature sensor (ID 3303) with simulated values
```

- Start the client to simulate a device with observable resources.
- Run the server to manage registrations, handle resource operations, and observe notifications.
- Explore `.well-known/core` for resource discovery.
- Utilize CBOR or TLV encoding/decoding for efficient payload exchange.

---

## 🏗️ Server Architecture

The LwM2M server implementation provides a comprehensive device management platform with the following components:

### Core Server Components

#### 1. Resource Client (`server/resourceClient.js`)
- **CoAP Server**: Standard LwM2M server on port 5683
- **DTLS Server**: Secure LwM2M server on port 5684
- **Protocol Support**: CoAP and DTLS transport layers
- **Event Emission**: Real-time server events via shared emitter

#### 2. Client Registry (`server/clientRegistry.js`)
- **Device Registration**: Tracks connected devices and their metadata
- **Location Management**: Maps registration locations to device endpoints
- **Connection State**: Monitors device connectivity and lifecycle

#### 3. Observation Registry (`server/observationRegistry.js`)
- **Resource Observations**: Manages active resource observations
- **Token Management**: Tracks observation tokens and associated resources
- **Notification Routing**: Routes notifications to correct observers

#### 4. Bootstrap Server (`server/bootstrap.js`)
- **Device Provisioning**: Provides initial configuration to devices
- **Security Management**: Provisions security objects and credentials
- **Configuration Storage**: Per-device bootstrap configurations

### Server-Side Features

| Component | Feature | Description |
|-----------|---------|-------------|
| **Client Management** | Registration Handling | Processes device registration requests |
| | Lifecycle Tracking | Monitors device connect/disconnect events |
| | Metadata Storage | Stores device information and capabilities |
| **Security** | DTLS Support | Encrypted communication with certificate validation |
| | Bootstrap Security | Secure device provisioning and credential management |
| | Authentication | Configurable client validation functions |
| **Resource Operations** | Read Operations | Handle GET requests for device resources |
| | Write Operations | Handle PUT requests to update device state |
| | Execute Operations | Handle POST requests for device actions |
| | Discovery | Support for `.well-known/core` resource discovery |
| **Observations** | Resource Monitoring | Real-time monitoring of device resources |
| | Notification Delivery | Asynchronous notification handling |
| | Token Management | Secure observation token tracking |
| **Data Formats** | Content Negotiation | Support for multiple data formats |
| | Format Conversion | Automatic encoding/decoding based on Accept headers |
| | Binary Support | Efficient binary data handling |

### Event-Driven Architecture

The server uses an event-driven architecture for real-time device management:

```javascript
const sharedEmitter = require('./server/transport/sharedEmitter');

// Available server events:
// - 'registration': Device registered
// - 'update': Registration updated  
// - 'deregistration': Device disconnected
// - 'notification': Resource notification received
// - 'bootstrap-request': Bootstrap requested
// - 'bootstrap-finish': Bootstrap completed
```

### Configuration and Deployment

#### Production Server Setup

```javascript
const { startLwM2MCoapServer } = require('./server/resourceClient');

// Custom validation for production
const productionValidation = async (ep, payload) => {
  // Implement authentication logic
  const isAuthorized = await checkDeviceAuthorization(ep);
  if (!isAuthorized) {
    throw new Error(`Unauthorized device: ${ep}`);
  }
  
  // Validate device capabilities
  const capabilities = parseRegistrationPayload(payload);
  if (!isValidCapabilities(capabilities)) {
    throw new Error(`Invalid capabilities for device: ${ep}`);
  }
  
  return true;
};

// Start production server
const server = startLwM2MCoapServer(productionValidation, 5683);
```

#### Monitoring and Analytics

```javascript
// Real-time device monitoring
const deviceMetrics = new Map();

sharedEmitter.on('registration', ({ ep, location }) => {
  deviceMetrics.set(ep, {
    registeredAt: Date.now(),
    lastSeen: Date.now(),
    location: location,
    notificationCount: 0
  });
});

sharedEmitter.on('notification', ({ ep, path, payload }) => {
  const metrics = deviceMetrics.get(ep);
  if (metrics) {
    metrics.lastSeen = Date.now();
    metrics.notificationCount++;
    deviceMetrics.set(ep, metrics);
  }
});

// Health check endpoint
setInterval(() => {
  const activeDevices = deviceMetrics.size;
  const totalNotifications = Array.from(deviceMetrics.values())
    .reduce((sum, device) => sum + device.notificationCount, 0);
  
  console.log(`Active devices: ${activeDevices}, Total notifications: ${totalNotifications}`);
}, 30000);
```

---

## TODO

### Planned Enhancements

- **OSCORE Security**: Implement Object Security for CoAP (RFC 8613)
- **Client-Side DTLS**: Add DTLS support for LwM2M clients
- **Persistent Storage**: Database backend for device state and configurations
- **Error Recovery**: Enhanced error handling and automatic retry mechanisms  
- **Performance Optimization**: Connection pooling and resource caching
- **Advanced Analytics**: Device behavior analytics and reporting dashboards
- **Bulk Operations**: Firmware update campaigns and mass device configuration
- **Protocol Extensions**: SMS binding and other transport alternatives

### Testing Improvements

- **Integration Tests**: End-to-end bootstrap and registration workflows
- **Performance Tests**: Load testing with multiple concurrent devices
- **Security Tests**: Penetration testing and vulnerability assessments
- **Compatibility Tests**: Interoperability with other LwM2M implementations

---

## Contributing

Feel free to open issues or submit pull requests to improve this library!

---

*Made with ❤️ for LwM2M enthusiasts.*

