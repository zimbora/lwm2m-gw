// client/transport/dtlsServer.js

const dtls = require('node-mbed-dtls');
const packet = require('coap-packet');
const path = require('path');

let server;
let observers = {}; // key: path, value: array of observer objects

const pskIdentity = Buffer.from('my_identity', 'utf8');
const pskKey = Buffer.from('736563726574', 'utf8'); // must be a Buffer

function createServer(handler, port = 56831, options = {}) {
  console.log(options);
  
  // Only add options that are defined and valid
  let dtlsOptions = {
    debug: 5,
    key: options.keyPath || path.join(__dirname, '../private.der'),
    certPath: options.certPath,
    debug: typeof options.debug === 'number' ? options.debug : 0,
    handshakeTimeoutMin: typeof options.handshakeTimeoutMin === 'number' ? options.handshakeTimeoutMin : 3000,
  };
  
/*
  let dtlsOptions = {
    debug : 8,
    key: options.key || path.join(__dirname, '../private.der'),
    type: 'udp4',
    port: port,
    psk: pskKey,
    PSKIdent: pskIdentity,
  }

  console.log(dtlsOptions);
*/
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

        // Create a CoAP request-like object
        const req = {
          method: parsed.code,
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