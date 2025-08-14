# DTLS Socket Pooling Implementation

This document demonstrates the DTLS socket pooling feature that eliminates multi-authentication for DTLS requests.

## Problem Statement

Previously, each DTLS request created a new socket and performed a complete DTLS handshake:

```javascript
// OLD BEHAVIOR - Each request creates new socket
const socket = dtls.createSocket({
  type: "udp4", 
  address: client.address,
  port: Number(client.port),
  psk: { "Client_identity": "secret" }
});
// New handshake required for every request
```

This caused:
- Performance overhead due to repeated handshakes
- Higher latency for requests
- Resource waste with short-lived connections
- Multiple authentication rounds for the same client

## Solution: Socket Pooling

The new implementation maintains persistent DTLS connections:

```javascript
// NEW BEHAVIOR - Reuse existing authenticated socket
const socketManager = getDTLSSocketManager();
const socket = await socketManager.getSocket(client.ep, client);
// Immediate reuse of authenticated connection
```

## Key Components

### 1. DTLSSocketManager (`server/transport/dtlsSocketManager.js`)
- Manages persistent DTLS sockets per client endpoint
- Handles connection lifecycle and cleanup
- Provides connection pooling and reuse logic

### 2. Enhanced Client Registry (`server/clientRegistry.js`)
- Automatically creates DTLS socket on client registration
- Cleans up socket on client deregistration
- Associates sockets with client endpoints

### 3. Modified DTLS Client (`server/transport/coapClientDTLS.js`)
- Uses socket manager instead of creating new sockets
- Reuses authenticated connections for all requests
- Maintains backward compatibility

## Usage Example

```javascript
const { startLwM2MDTLSCoapServer, getRequest } = require('./server/resourceClient');

// Start DTLS server with socket pooling enabled
const server = startLwM2MDTLSCoapServer(validation, dtlsOptions);

// When client registers, socket is automatically created and pooled
// Subsequent requests reuse the same authenticated socket:

await getRequest('client-001', '/3/0/0');  // Uses pooled socket
await getRequest('client-001', '/3/0/1');  // Reuses same socket  
await getRequest('client-001', '/3/0/2');  // Reuses same socket
```

## Performance Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Socket Creation | Per request | Per client |
| DTLS Handshakes | Every request | Once per registration |
| Connection Overhead | High | Minimal |
| Resource Usage | Wasteful | Efficient |
| Request Latency | Variable (handshake time) | Consistent (low) |

## Testing

### Unit Tests
```bash
npm test -- test/dtls-socket-manager.test.js
npm test -- test/dtls-socket-reuse.test.js
```

### Integration Demo
```bash
node test/manual/dtls-integration-test.js
```

The integration test demonstrates:
- Socket creation on first request
- Socket reuse on subsequent requests  
- Performance timing differences
- Connection pooling statistics

## Backward Compatibility

The implementation is fully backward compatible:
- Existing DTLS server examples work unchanged
- Client code requires no modifications
- Same API surface and behavior
- Transparent socket pooling

## Configuration

Socket pooling behavior can be configured:

```javascript
const socketManager = new DTLSSocketManager({
  timeout: 300000,      // 5 minute idle timeout
  cleanupInterval: 60000 // Check every minute
});
```

## Monitoring

Get socket pool statistics:

```javascript
const stats = socketManager.getStats();
console.log(`Active sockets: ${stats.totalSockets}`);
console.log('Socket details:', stats.sockets);
```

## Automatic Cleanup

The system automatically:
- Closes idle sockets after timeout (default 5 minutes)
- Cleans up on client deregistration
- Handles connection failures gracefully  
- Prevents socket accumulation

This implementation successfully eliminates the multi-authentication problem while maintaining full compatibility with existing code.