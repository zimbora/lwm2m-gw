const coapPacket = require('coap-packet');
const { dtls } = require('node-dtls-client');

function sendDTLSCoapRequest(options, callback) {
  // options: { hostname, port, pathname, method, query, options, payload, psk }
  if (!options || !options.hostname || !options.port) {
      return callback(new Error('Invalid options: hostname and port are required'));
  }

  // Map method to CoAP code
  const methodMap = { GET: '0.01', POST: '0.02', PUT: '0.03', DELETE: '0.04' };
  const code = methodMap[(options.method || 'GET').toUpperCase()] || '0.01';

  // Build CoAP options array
  const coapOptions = [];
  if (options.pathname) {
    options.pathname.split('/').filter(Boolean).forEach(segment => {
      coapOptions.push({ name: 'Uri-Path', value: Buffer.from(segment) });
    });
  }
  if (options.query) {
    coapOptions.push({ name: 'Uri-Query', value: Buffer.from(options.query) });
  }
  if (options.options) {
    Object.entries(options.options).forEach(([name, value]) => {
      coapOptions.push({ name, value: Buffer.from(value) });
    });
  }

  // Generate CoAP packet
  const coapReq = coapPacket.generate({
    confirmable: true,
    messageId: Math.floor(Math.random() * 65535),
    code,
    options: coapOptions,
    payload: options.payload ? Buffer.from(options.payload) : Buffer.alloc(0)
  });

  // Create DTLS socket
  const dtlsOptions = {
    type: 'udp4',
    address: options.hostname,
    port: options.port,
    psk: options.psk || { "Client_identity": "secret" }
  };
  const socket = dtls.createSocket(dtlsOptions);

  let timeout = setTimeout(() => {
    socket.close();
    callback(new Error('CoAP DTLS request timed out'));
  }, options.timeout || 5000);

  socket.on('connected', () => {
    socket.send(coapReq);
  });

  socket.on('message', (msg) => {
    clearTimeout(timeout);
    try {
      const parsed = coapPacket.parse(msg);
      callback(null, parsed);
    } catch (err) {
      callback(new Error(`Failed to parse CoAP response: ${err.message}`));
    }
    //socket.close();
  });

  socket.on('error', (err) => {
    clearTimeout(timeout);
    callback(err);
    socket.close();
  });

  socket.on('close', () => {
    clearTimeout(timeout);
  });
}

module.exports = sendDTLSCoapRequest;