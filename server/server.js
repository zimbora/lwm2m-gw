// server/server.js
const coap = require('coap');
const { handleRegister, handleUpdate, handleDeregister} = require('./registration');
const { sendCoapRequest, emitter } = require('./coapClient');
const registry = require('./clientRegistry');

function startLwM2MServer(port = 5683) {
  const server = coap.createServer();

  server.on('request', (req, res) => {
      
    const path = req.options
    .filter(opt => opt.name === 'Uri-Path')
    .map(opt => opt.value.toString())
    .join('/');

    const format = req.options
    .filter(opt => opt.name === 'Content-Format')
    .map(opt => opt.value.toString())

    const observeSeqNumber = req.options
    .filter(opt => opt.name === 'Observe')
    .map(opt => opt.value.toString())

    if (req.method === 'POST' && path === 'rd') {
      handleRegister(req, res)
        .then(({ ep, location }) => {
          console.log(`[Server] Client ${ep} registered at ${location}`);

          // Delay slightly to allow client to start its resource server
          setTimeout(() => {
            try {
              getInfo(ep);
            } catch (err) {
              console.error(`[Server] Failed to get info from ${ep}:`, err);
            }
          }, 100); // You can increase this to 200–300ms if timing issues arise
        })
        .catch(err => {
          console.error('[Server] Registration failed:', err);
        });
    }

    if (req.method === 'POST' && path.startsWith('rd/')) {
      return handleUpdate(req, res, path);
    }

    if (req.method === 'DELETE' && path.startsWith('rd/')) {
      return handleDeregister(req, res, path);
    } 

    // Handle client-pushed notifications (e.g. Observe)
    if (req.method === 'GET' || req.method === 'PUT' || req.method === 'POST') {
      let payload = '';
      req.on('data', (chunk) => {
        payload += chunk.toString();
      });

      req.on('end', () => {
        console.log(`[Server] Notification from client at ${req.rsinfo.address}:${req.rsinfo.port}`);
        console.log(`[Server] Path: /${path}`);
        console.log(`[Server] Format: ${format}`);
        console.log(`[Server] observeSeqNumber: ${observeSeqNumber}`);
        console.log(`[Server] Payload: ${payload}`);
        res.code = '2.04';
        res.end(); // Acknowledge receipt
      });
      return;
    }

    res.code = '4.04';
    res.end('Not Found');
    
  });

  server.listen(port, () => {
    console.log(`[Server] LwM2M server listening on port ${port}`);
  });
}

function getInfo(clientEp) {
  // Delay to wait for client registration
  setTimeout(() => {
    const client = clientEp;
    //console.log(`sending requests to client: ${client}`)

    // Read
    sendCoapRequest(client, 'GET', '/.well-known/core');

    sendCoapRequest(client, 'GET', '/3/0/0');

    // Observe something
    //sendCoapRequest(client, 'GET', '/3/0/1', null, true);

    // Observe Temperature
    //sendCoapRequest(client, 'GET', '/3303/0/5700', null, true);

    // Write
    setTimeout(() => sendCoapRequest(client, 'PUT', '/3/0/1', 'NewModel'), 7000);

    setTimeout(() => sendCoapRequest(client, 'GET', '/3/0/1'), 8000);

    // Execute
    //setTimeout(() => sendCoapRequest(client, 'POST', '/3/0/2'), 9000);
  }, 3000);
}

function parseCoreLinkFormat(coreString) {
  const entries = coreString.split(',');
  const resources = [];

  for (const entry of entries) {
    const match = entry.match(/^<([^>]+)>(.*)$/);
    if (!match) continue;

    const path = match[1];
    const attrString = match[2];
    const attributes = {};

    // Parse each ;key[=value] pair
    const parts = attrString.split(';').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const [key, val] = part.split('=');
      if (val === undefined) {
        attributes[key] = true;
      } else {
        // Remove quotes if present
        attributes[key] = val.replace(/^"|"$/g, '');
      }
    }

    resources.push({ path, attributes });
  }

  return resources;
}

startLwM2MServer();


emitter.on('response', ({ ep, method, path, payload, observe }) => {
  
  console.log(`[Event] Got response from ${ep} ${path} via ${method}:`);

  if(path === '/.well-known/core'){
    const res = parseCoreLinkFormat(payload);
    //console.log(res)
  }else{
    console.log(`[Server] Payload received: ${payload}`);
    if (!observe) console.log('[Server] End of response');
  }
});


setInterval(()=>{
  console.log('[Server] Registered clients:', registry.listClients());
},60000)
