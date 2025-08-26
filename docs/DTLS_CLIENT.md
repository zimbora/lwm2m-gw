# DTLS Client Support

This implementation adds DTLS (Datagram Transport Layer Security) support to the LwM2M client using the `node-mbed-dtls` library.

## Components

### 1. DTLS Transport (`client/transport/dtlsServer.js`)

- Provides secure CoAP communication over DTLS
- Handles CoAP packet parsing and generation over secure connections
- Compatible with existing LwM2M resource handlers

### 2. DTLS Resource Server (`client/dtlsResourceServer.js`)

- DTLS-enabled version of the standard resource server
- Processes LwM2M requests over secure DTLS connections
- Supports all standard LwM2M operations (GET, PUT, POST, DELETE)

### 3. DTLS Client Example (`client/examples/dtlsClient.js`)

- Complete example demonstrating DTLS-enabled LwM2M client
- Shows how to start a secure resource server
- Includes testing instructions for DTLS connections

## Usage

### Starting a DTLS Client

```bash
node client/examples/dtlsClient.js
```

This will start a DTLS-enabled LwM2M client that:

- Listens on port 56831 for secure DTLS connections
- Accepts CoAP requests over DTLS
- Provides access to standard LwM2M resources

### Testing with DTLS Clients

You can test the DTLS server using DTLS-enabled CoAP clients such as:

```bash
# Using libcoap (if available)
coap-client -m GET -k path/to/key coaps://localhost:56831/3/0/0

# The server supports standard LwM2M resources:
# - /3/0/0 (Device Object - Manufacturer)
# - /3303/0/5700 (Temperature Sensor - Sensor Value)
# - /.well-known/core (Resource Discovery)
```

## Configuration

The DTLS server accepts configuration options:

```javascript
const dtlsOptions = {
  key: 'path/to/private.der', // Private key file
  debug: 0, // Debug level (0-5)
  handshakeTimeoutMin: 3000, // Handshake timeout in ms
};

startDtlsResourceServer(port, dtlsOptions);
```

## Security Notes

- The example uses a test certificate for demonstration purposes
- In production, use proper X.509 certificates and private keys
- The current implementation supports server-side DTLS only
- Client-side DTLS connections would require additional libraries

## Testing

Run the DTLS transport tests:

```bash
npm test -- test/client/dtlsTransport.test.js
```

This verifies that CoAP packet parsing and generation work correctly over DTLS.
