// server/coapClient.js
const EventEmitter = require('events');
const coap = require('coap');

const { getClient } = require('./clientRegistry');

const emitter = new EventEmitter();

function sendCoapRequest(ep, method, path, payload = null, observe = false) {
  const client = getClient(ep);
  if (!client) return console.error(`[Server] Client '${ep}' not found`);

  const options = {
    hostname: client.address,
    port: client.port,
    pathname: path,
    method,
    confirmable: true,
    observe: observe ? 0 : undefined
  };

  const req = coap.request(options);

  if (payload) {
    req.write(payload);
  }

  req.on('response', (res) => {
    console.log(`[Server] Response from ${ep} ${path}:`);
    //res.pipe(process.stdout);


    let payload = '';
    res.on('data', (chunk) => {
      payload += chunk.toString();
    });

    res.on('end', () => {

      emitter.emit('response', { ep, method, path, payload, observe });

    });

  });

  req.end();
}

module.exports = { sendCoapRequest, emitter };