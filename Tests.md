# Tests

## Global
>> npm test

## File
>> npx jest test/client/resourceServer.test.js

## Server Tests (folder)

### Run server tests
>> npx jest test/server/*.test.js
>> npx jest test/server/*.test.js --coverage

### ToDo
 - CoapServerEvents (observing) has something running on background..

### Server tests coverage
-------------------------|---------|----------|---------|---------|------------------------------------
File                     | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                  
-------------------------|---------|----------|---------|---------|------------------------------------
All files                |   34.95 |    25.58 |   39.09 |   35.45 |                                    
 server                  |    52.5 |    47.13 |   52.04 |   52.71 |                                    
  bootstrap.js           |    92.3 |       80 |   77.77 |    92.3 | 32,42                              
  clientRegistry.js      |      90 |      100 |   83.33 |      90 | 32-33                              
  handleBootstrap.js     |   37.14 |    34.61 |   35.29 |   37.14 | ...8,89-94,100-102,117-119,129-298 
  handleRegistration.js  |   81.66 |    78.57 |     100 |   81.66 | 21-22,47-49,77-79,101-103          
  mqttRequestHandler.js  |   76.66 |    83.87 |     100 |   76.66 | 56-57,75-91,164-165,181            
  observationRegistry.js |   71.42 |       72 |      80 |   71.42 | 53-54,63-68,78-79                  
  resourceClient.js      |    34.7 |    26.49 |   34.69 |   35.02 | ...440,472,493-499,508,513-518,531 
 server/transport        |   10.45 |        0 |       0 |   10.95 |                                    
  coapClient.js          |   11.36 |        0 |       0 |   11.36 | 19-95                              
  coapClientDTLS.js      |    8.77 |        0 |       0 |    8.77 | 18-124                             
  mqttClient.js          |    6.12 |        0 |       0 |    7.14 | 16-95                              
  sharedEmitter.js       |     100 |      100 |     100 |     100 |                                    
 utils                   |    6.84 |     1.72 |    8.33 |    6.95 |                                    
  cbor.js                |   14.28 |        0 |       0 |   14.28 | 5-29                               
  contentFormats.js      |     100 |      100 |     100 |     100 |                                    
  payloadCodec.js        |   17.02 |     6.06 |      25 |   17.77 | 18-53,66,72,78-126                 
  tlv.js                 |    0.78 |        0 |       0 |    0.79 | 6-209                              
-------------------------|---------|----------|---------|---------|------------------------------------


