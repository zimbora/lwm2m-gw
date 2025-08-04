# LwM2M Bootstrap Server

This document describes the Bootstrap Server implementation for the LwM2M Node.js library.

## Overview

The Bootstrap Server provides initial configuration and provisioning capabilities for LwM2M devices. It implements the following key features:

### 1. Provisioning Credentials
- Supplies initial security credentials (keys, certificates)
- Enables secure communication between client and LwM2M server
- Manages security object (Object ID 0) instances

### 2. Device Configuration  
- Provides configuration parameters necessary for client operation
- Supplies server addresses and operational settings
- Manages server object (Object ID 1) instances

### 3. Initial Registration Facilitation
- Delivers bootstrap information for main LwM2M server connection
- Coordinates the transition from bootstrap to operational mode
- Ensures client can connect and interact with main LwM2M server

### 4. Security Management
- Manages security object provisioning
- Supports updating and revoking credentials
- Handles security mode configuration

## Architecture

### Bootstrap Server (`server/bootstrap.js`)
- Runs on port 5684 (standard LwM2M bootstrap port)
- Handles `/bs` bootstrap requests
- Handles `/bs-finish` completion notifications
- Emits events for bootstrap lifecycle

### Bootstrap Handler (`server/handleBootstrap.js`)
- Processes bootstrap requests and provisioning
- Manages bootstrap configurations per endpoint
- Handles object instance creation/deletion
- Implements TLV encoding for object data

### Bootstrap Client (`client/bootstrap.js`)
- Requests bootstrap from bootstrap server
- Waits for provisioning to complete
- Sends bootstrap finish notification
- Integrates with main registration flow

## Usage

### Starting Bootstrap Server

```javascript
const { startBootstrapServer } = require('./server/bootstrap');

// Start with default configuration
const server = startBootstrapServer(); // Listens on port 5684

// Or specify custom port
const server = startBootstrapServer(5685);
```

### Standalone Bootstrap Server

```bash
node server/bootstrapServer.js
```

### Bootstrap Client

```javascript
const { performBootstrap } = require('./client/bootstrap');

// Perform full bootstrap sequence
await performBootstrap('my-device', 'bootstrap-server.example.com', 5684);
```

### Bootstrap-enabled Client

```bash
node client/bootstrapClient.js
```

## Bootstrap Configuration

### Default Configuration

```javascript
{
  securityInstances: [
    {
      instanceId: 0,
      serverUri: 'coap://localhost:5683',
      isBootstrap: false,
      securityMode: 3, // NoSec
      shortServerId: 123
    }
  ],
  serverInstances: [
    {
      instanceId: 0,
      shortServerId: 123,
      lifetime: 300,
      binding: 'U',
      notificationStoring: true
    }
  ]
}
```

### Custom Configuration

```javascript
const { setBootstrapConfiguration } = require('./server/handleBootstrap');

setBootstrapConfiguration('device-001', {
  securityInstances: [
    {
      instanceId: 0,
      serverUri: 'coaps://secure-server.example.com:5684',
      isBootstrap: false,
      securityMode: 2, // PSK
      shortServerId: 999,
      publicKey: 'device-001',
      secretKey: 'shared-secret'
    }
  ],
  serverInstances: [
    {
      instanceId: 0,
      shortServerId: 999,
      lifetime: 3600,
      binding: 'U',
      notificationStoring: true
    }
  ]
});
```

## Bootstrap Process Flow

1. **Bootstrap Request**: Client sends POST to `/bs?ep=<endpoint-name>`
2. **Provisioning**: Server provisions security and server objects
   - Deletes existing security instances (Object 0)
   - Deletes existing server instances (Object 1)  
   - Creates new security instances with server configuration
   - Creates new server instances with operational parameters
3. **Bootstrap Finish**: Server sends bootstrap finish to client
4. **Registration**: Client registers to main LwM2M server using provisioned configuration

## Events

The bootstrap server emits the following events:

- `bootstrap-request`: Client requested bootstrap
- `bootstrap-finish`: Client completed bootstrap process

```javascript
const sharedEmitter = require('./server/transport/sharedEmitter');

sharedEmitter.on('bootstrap-request', ({ protocol, ep }) => {
  console.log(`Client ${ep} requested bootstrap via ${protocol}`);
});

sharedEmitter.on('bootstrap-finish', ({ protocol, ep }) => {
  console.log(`Client ${ep} finished bootstrap via ${protocol}`);
});
```

## Testing

Run bootstrap server tests:
```bash
npm test -- test/server/bootstrap.test.js
```

Run bootstrap client tests:
```bash
npm test -- test/client/bootstrap.test.js
```

## Demo Workflow

1. Start bootstrap server:
   ```bash
   node server/bootstrapServer.js
   ```

2. Start main LwM2M server (in another terminal):
   ```bash
   node server/server.js
   ```

3. Start bootstrap client (in another terminal):
   ```bash
   node client/bootstrapClient.js
   ```

The client will:
1. Connect to bootstrap server (port 5684)
2. Receive provisioning configuration
3. Connect to main LwM2M server (port 5683)
4. Begin normal LwM2M operations

## Security Considerations

- Bootstrap server should run in secure environment
- Consider implementing authentication for bootstrap requests
- Use encrypted transport (DTLS) for production deployments
- Regularly rotate and update credentials
- Monitor bootstrap requests for anomalies

## Future Enhancements

- DTLS/CoAPS support for secure bootstrap
- Database-backed configuration storage
- Web interface for bootstrap configuration management
- Advanced credential management (certificates, keys)
- Bulk device provisioning capabilities