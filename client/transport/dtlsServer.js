// client/transport/dtlsServer.js

const dtls = require('node-mbed-dtls');
const coap = require('coap');
const path = require('path');

let server;
let observers = {}; // key: path, value: array of observer objects

function createServer(handler, port = 56830, options = {}) {
  // Default DTLS options
  const dtlsOptions = {
    key: options.key || path.join(__dirname, '../private.der'),
    debug: options.debug || 0,
    handshakeTimeoutMin: options.handshakeTimeoutMin || 3000,
    ...options
  };

  server = dtls.createServer(dtlsOptions, (socket) => {
    $.logger.info(`[Client] DTLS secure connection from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
      try {
        // Process incoming CoAP message over DTLS
        // We need to parse the CoAP packet and create a request/response object similar to what coap.createServer does
        const parsed = coap.parse(data);
        if (!parsed) {
          $.logger.error('[Client] Failed to parse CoAP message over DTLS');
          return;
        }

        // Create a CoAP request-like object
        const req = {
          method: parsed.method,
          url: parsed.url,
          headers: parsed.options,
          payload: parsed.payload,
          code: parsed.code,
          token: parsed.token,
          messageId: parsed.messageId,
          ack: parsed.ack,
          reset: parsed.reset
        };

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
              const response = coap.generate({
                code: this.code,
                payload: this.payload,
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