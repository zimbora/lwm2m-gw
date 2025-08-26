# Tests

## Automated CI/CD

### GitHub Actions Workflow

The repository includes a comprehensive GitHub Actions workflow that automatically:

- **Runs tests** on Node.js 18.x and 20.x
- **Generates coverage reports** using Jest's built-in coverage
- **Publishes test results** in JUnit XML format
- **Uploads coverage** to Codecov (when configured)

**Triggered on:**

- Push to `main` branch
- Pull requests targeting `main` branch

**Commands used:**

- `npm ci` - Clean install dependencies
- `npm run test:ci` - Run tests with coverage and JUnit reporting

### Workflow Badge

[![Tests](https://github.com/zimbora/lwm2m-node/actions/workflows/test.yml/badge.svg)](https://github.com/zimbora/lwm2m-node/actions/workflows/test.yml)

## Global

> > npm test
> > npm run test:ci # CI version with coverage and JUnit reporting

## File

> > npx jest test/client/resourceServer.test.js

## Server Tests

### Run server tests

> > npx jest test/server/_.test.js
> > npx jest test/server/_.test.js --coverage

### ToDo

- CoapServerEvents (observing) has something running on background..

### Server tests coverage

-------------------------|---------|----------|---------|---------|------------------------------------
File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s  
-------------------------|---------|----------|---------|---------|------------------------------------
All files | 34.95 | 25.58 | 39.09 | 35.45 |  
 server | 52.5 | 47.13 | 52.04 | 52.71 |  
 bootstrap.js | 92.3 | 80 | 77.77 | 92.3 | 32,42  
 clientRegistry.js | 90 | 100 | 83.33 | 90 | 32-33  
 handleBootstrap.js | 37.14 | 34.61 | 35.29 | 37.14 | ...8,89-94,100-102,117-119,129-298
handleRegistration.js | 81.66 | 78.57 | 100 | 81.66 | 21-22,47-49,77-79,101-103  
 mqttRequestHandler.js | 76.66 | 83.87 | 100 | 76.66 | 56-57,75-91,164-165,181  
 observationRegistry.js | 71.42 | 72 | 80 | 71.42 | 53-54,63-68,78-79  
 resourceClient.js | 34.7 | 26.49 | 34.69 | 35.02 | ...440,472,493-499,508,513-518,531
server/transport | 10.45 | 0 | 0 | 10.95 |  
 coapClient.js | 11.36 | 0 | 0 | 11.36 | 19-95  
 coapClientDTLS.js | 8.77 | 0 | 0 | 8.77 | 18-124  
 mqttClient.js | 6.12 | 0 | 0 | 7.14 | 16-95  
 sharedEmitter.js | 100 | 100 | 100 | 100 |  
 utils | 6.84 | 1.72 | 8.33 | 6.95 |  
 cbor.js | 14.28 | 0 | 0 | 14.28 | 5-29  
 contentFormats.js | 100 | 100 | 100 | 100 |  
 payloadCodec.js | 17.02 | 6.06 | 25 | 17.77 | 18-53,66,72,78-126  
 tlv.js | 0.78 | 0 | 0 | 0.79 | 6-209  
-------------------------|---------|----------|---------|---------|------------------------------------

## Client Tests

### Run client tests

> > npx jest test/client/_.test.js
> > npx jest test/client/_.test.js --coverage

### ToDo

- resourceServer has something running on background..

### Client coverage

----------------------------|---------|----------|---------|---------|---------------------------------
File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s  
----------------------------|---------|----------|---------|---------|---------------------------------
All files | 31.56 | 23.09 | 29.41 | 32.24 |  
 client | 41.07 | 36.31 | 39.06 | 42.48 |  
 bootstrap.js | 37.14 | 16.66 | 50 | 37.14 | 27-28,36-38,68-69,77-79,91-158  
 logger.js | 100 | 100 | 100 | 100 |  
 registration.js | 48.21 | 42.1 | 50 | 49.51 | ...-143,157-158,163-180,197-199
resourceServer.js | 71.42 | 51.61 | 100 | 71.42 | 40,51,53,55,69-75  
 routes.js | 32.1 | 33.33 | 10 | 34.09 | ...,151-159,162-171,177,189-307
client/objects | 41.25 | 23.07 | 20 | 41.77 |  
 accessControl.js | 100 | 100 | 100 | 100 |  
 connectivityMonitoring.js | 100 | 100 | 100 | 100 |  
 device.js | 20 | 100 | 0 | 20 | 10-14  
 firmwareUpdate.js | 66.66 | 100 | 0 | 66.66 | 10  
 index.js | 40.81 | 25.71 | 50 | 41.66 | 12-14,17-19,28,31,34,45-88  
 location.js | 75 | 100 | 0 | 75 | 49  
 security.js | 100 | 100 | 100 | 100 |  
 server.js | 50 | 100 | 0 | 50 | 12  
 temperature.js | 21.42 | 0 | 0 | 21.42 | 57-60,72-83  
 client/transport | 15.04 | 1.56 | 14.28 | 15.31 |  
 coapServer.js | 52.38 | 20 | 66.66 | 55 | 18-36,51  
 dtlsServer.js | 6.52 | 0 | 0 | 6.59 | 16-251  
 utils | 16.84 | 12.06 | 25 | 17.11 |  
 cbor.js | 50 | 14.28 | 50 | 50 | 17-29  
 contentFormats.js | 100 | 100 | 100 | 100 |  
 payloadCodec.js | 19.14 | 27.27 | 25 | 20 | 19,24-30,42-126  
 tlv.js | 11.02 | 5.26 | 16.66 | 11.11 | 13-73,84,90-100,108-209  
----------------------------|---------|----------|---------|---------|---------------------------------

Test Suites: 4 passed, 4 total
Tests: 20 passed, 20 total
Snapshots: 0 total
Time: 5.27 s

## Utils Tests (encoding/decoding)

### Run utils tests

> > npx jest test/utils/_.test.js
> > npx jest test/utils/_.test.js --coverage

### Utils coverage

-------------------|---------|----------|---------|---------|------------------------------------------
File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s  
-------------------|---------|----------|---------|---------|------------------------------------------
All files | 75.78 | 65.51 | 66.66 | 76.47 |  
 cbor.js | 92.85 | 85.71 | 100 | 92.85 | 29  
 contentFormats.js | 100 | 100 | 100 | 100 |  
 payloadCodec.js | 95.74 | 93.93 | 100 | 97.77 | 116  
 tlv.js | 66.14 | 51.31 | 33.33 | 66.66 | ...3-100,108-118,132,145-150,155,192-203
-------------------|---------|----------|---------|---------|------------------------------------------

Test Suites: 3 passed, 3 total
Tests: 36 passed, 36 total
Snapshots: 0 total
Time: 0.236 s, estimated 1 s
Ran all test suites matching /test\/utils\/cbor.test.js|test\/utils\/payloadCodec.test.js|test\/utils\/tlv.test.js/i.

## Run all tests

> > npx jest test/_/_.test.js --coverage

## Tests coverage

----------------------------|---------|----------|---------|---------|---------------------------------
File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s  
----------------------------|---------|----------|---------|---------|---------------------------------
All files | 44.42 | 36.43 | 37.91 | 45.26 |  
 client | 41.07 | 36.31 | 39.06 | 42.48 |  
 bootstrap.js | 37.14 | 16.66 | 50 | 37.14 | 27-28,36-38,68-69,77-79,91-158  
 logger.js | 100 | 100 | 100 | 100 |  
 registration.js | 48.21 | 42.1 | 50 | 49.51 | ...-143,157-158,163-180,197-199
resourceServer.js | 71.42 | 51.61 | 100 | 71.42 | 40,51,53,55,69-75  
 routes.js | 32.1 | 33.33 | 10 | 34.09 | ...,151-159,162-171,177,189-307
client/objects | 41.25 | 23.07 | 20 | 41.77 |  
 accessControl.js | 100 | 100 | 100 | 100 |  
 connectivityMonitoring.js | 100 | 100 | 100 | 100 |  
 device.js | 20 | 100 | 0 | 20 | 10-14  
 firmwareUpdate.js | 66.66 | 100 | 0 | 66.66 | 10  
 index.js | 40.81 | 25.71 | 50 | 41.66 | 12-14,17-19,28,31,34,45-88  
 location.js | 75 | 100 | 0 | 75 | 49  
 security.js | 100 | 100 | 100 | 100 |  
 server.js | 50 | 100 | 0 | 50 | 12  
 temperature.js | 21.42 | 0 | 0 | 21.42 | 57-60,72-83  
 client/transport | 15.04 | 1.56 | 14.28 | 15.31 |  
 coapServer.js | 52.38 | 20 | 66.66 | 55 | 18-36,51  
 dtlsServer.js | 6.52 | 0 | 0 | 6.59 | 16-251  
 server | 52.5 | 47.13 | 52.04 | 52.71 |  
 bootstrap.js | 92.3 | 80 | 77.77 | 92.3 | 32,42  
 clientRegistry.js | 90 | 100 | 83.33 | 90 | 32-33  
 handleBootstrap.js | 37.14 | 34.61 | 35.29 | 37.14 | ...9-94,100-102,117-119,129-298
handleRegistration.js | 81.66 | 78.57 | 100 | 81.66 | 21-22,47-49,77-79,101-103  
 mqttRequestHandler.js | 76.66 | 83.87 | 100 | 76.66 | 56-57,75-91,164-165,181  
 observationRegistry.js | 71.42 | 72 | 80 | 71.42 | 53-54,63-68,78-79  
 resourceClient.js | 34.7 | 26.49 | 34.69 | 35.02 | ...,472,493-499,508,513-518,531
server/transport | 10.45 | 0 | 0 | 10.95 |  
 coapClient.js | 11.36 | 0 | 0 | 11.36 | 19-95  
 coapClientDTLS.js | 8.77 | 0 | 0 | 8.77 | 18-124  
 mqttClient.js | 6.12 | 0 | 0 | 7.14 | 16-95  
 sharedEmitter.js | 100 | 100 | 100 | 100 |  
 utils | 75.78 | 65.51 | 66.66 | 76.47 |  
 cbor.js | 92.85 | 85.71 | 100 | 92.85 | 29  
 contentFormats.js | 100 | 100 | 100 | 100 |  
 payloadCodec.js | 95.74 | 93.93 | 100 | 97.77 | 116  
 tlv.js | 66.14 | 51.31 | 33.33 | 66.66 | ...-118,132,145-150,155,192-203
----------------------------|---------|----------|---------|---------|---------------------------------

Test Suites: 14 passed, 14 total
Tests: 127 passed, 127 total
Snapshots: 0 total
Time: 5.203 s
