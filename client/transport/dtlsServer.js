// client/transport/dtlsServer.js

const dtls = require('node-mbedtls-server');
const { dtlsClient } = require('node-dtls-client');
const packet = require('coap-packet');
const path = require('path');

let server;
let observers = {}; // key: path, value: array of observer objects

function createServer(handler, port = 56831, dtlsOptions = {}) {

  server = dtls.createServer(dtlsOptions, (socket) => {
    $.logger.info(`[Client] DTLS secure connection from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
      try {
        // Process incoming CoAP message over DTLS
        // Parse the CoAP packet using coap-packet library
        const parsed = packet.parse(data);
        if (!parsed) {
          $.logger.error('[Client] Failed to parse CoAP message over DTLS');
          return;
        }

        const method = {
          '0.01': 'GET',
          '0.02': 'POST',
          '0.03': 'PUT',
          '0.04': 'DELETE'
        }[parsed.code] || 'UNKNOWN';

        // Create a CoAP request-like object
        const req = {
          method: method,
          url: parsed.url || '/',
          headers: {},
          payload: parsed.payload,
          code: parsed.code,
          token: parsed.token,
          messageId: parsed.messageId,
          ack: parsed.ack,
          reset: parsed.reset
        };

        // Convert options to headers format
        if (parsed.options) {
          parsed.options.forEach(opt => {
            if (opt.name === 'Uri-Path') {
              // Build URL from Uri-Path options
              if (!req.url || req.url === '/') {
                req.url = '';
              }
              req.url += '/' + opt.value.toString();
            } else {
              req.headers[opt.name] = opt.value;
            }
          });
        }

        // Ensure URL starts with /
        if (!req.url.startsWith('/')) {
          req.url = '/' + req.url;
        }

        // Create a CoAP response-like object
        const res = {
          code: '2.05',
          payload: null,
          options: [],
          setOption: function(name, value) {
            this.options.push({ name, value });
          },
          end: function(payload) {
            this.payload = payload;
            // Send CoAP response back over DTLS
            try {
              const response = packet.generate({
                code: this.code,
                payload: Buffer.from(this.payload || ''),
                options: this.options,
                token: req.token,
                messageId: req.messageId,
                ack: true
              });
              socket.write(response);
            } catch (error) {
              $.logger.error(`[Client] Failed to generate CoAP response over DTLS: ${error.message}`);
            }
          }
        };

        if (handler && typeof handler === 'function') {
          handler(req, res);
        }
      } catch (error) {
        $.logger.error(`[Client] DTLS message processing error: ${error.message}`);
      }
    });

    socket.on('error', (err) => {
      $.logger.error(`[Client] DTLS socket error from ${socket.remoteAddress}:${socket.remotePort}: ${err}`);
    });

    socket.on('close', () => {
      $.logger.info(`[Client] DTLS connection closed from ${socket.remoteAddress}:${socket.remotePort}`);
    });
  });

  server.on('clientError', (err) => {
    $.logger.error(`[Client] DTLS client error: ${err}`);
  });

  server.on('error', (err) => {
    $.logger.error(`[Client] DTLS server error: ${err}`);
  });

  server.listen(port, () => {
    $.logger.info(`[Client] DTLS Resource server with Observe support on port ${port}`);
  });

  return server;
}

function sendNotification(observer, path, value) {
  if (!$.client.registered) return;

  $.logger.info(`[Client] Sending DTLS notification for ${path}: ${value}`);

  // For DTLS notifications, we would need to establish a DTLS connection to the observer
  // This is more complex than regular CoAP and would require maintaining DTLS connections
  // For now, log the notification
  $.logger.warn(`[Client] DTLS notifications not yet implemented for ${observer.address}:${observer.port}`);

  if (!$.client.registered) return;
  
  $.logger.info(`[Client] Sending notification for ${path}: ${value}`);

  const coapReq = coapPacket.generate({
    confirmable: true,
    messageId: Math.floor(Math.random() * 65535),
    method: 'GET',  // Use GET for notifications
    token: observer.token,
    options: [
      { name: 'Uri-Path', value: Buffer.from('/' + path) },
      { name: 'Observe', value: Buffer.from(observer.observeSeq & 0xffffff) },
      { name: 'Content-Format', value: Buffer.from('text/plain') }
    ],
    payload: Buffer.alloc(String(value))
  });

  const socket = dtlsClient.createSocket({
    type: "udp4",
    address: observer.address,
    port: observer.port,
    psk: { "Client_identity": "secret" }
  })
  .on("connected", () => {
    console.log("secure connection established");
    console.log("sending CoAP request...");
    socket.send(coapReq);
  })
  .on("error", (e) => console.error(`error: ${e.message}`))
  .on("message", (msg) => {
    const parsed = coapPacket.parse(msg);
    console.log('Received CoAP response:', parsed);
    console.log(`payload: ${parsed.payload.toString()}`);
  })
  .on("close", () => console.log("connection closed"));

  req.write(String(value));
  req.end();

  observer.observeSeq++;

}

function stopObservation(resource) {
  if (resource?._interval) {
    clearInterval(resource._interval);
    delete resource._interval;
  }
}

function getObservers() {
  return observers;
}

function getServer() {
  return server;
}

module.exports = {
  createServer,
  sendNotification,
  stopObservation,
  getObservers,
  getServer
};