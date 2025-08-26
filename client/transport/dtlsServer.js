// client/transport/dtlsServer.js

const dtlsMbed = require('node-mbedtls-server');
// dtlsClient is not being used but is the high level api from lib
// check if should be changed in the future
const { dtls, dtlsClient } = require('node-dtls-client');
const packet = require('coap-packet');
const path = require('path');

let server;
const observers = {}; // key: path, value: array of observer objects

function createServer(handler, port = 56831, dtlsOptions = {}) {
  server = dtlsMbed.createServer(dtlsOptions, (socket) => {
    $.logger.info(
      `[Client] DTLS secure connection from ${socket.remoteAddress}:${socket.remotePort}`
    );

    socket.on('data', (data) => {
      //console.log(socket);
      // Process incoming CoAP message over DTLS
      // Parse the CoAP packet using coap-packet library
      let parsed = null;
      try {
        parsed = packet.parse(data);
      } catch (err) {
        console.log(err);
      }

      if (!parsed) {
        $.logger.error('[Client] Failed to parse CoAP message over DTLS');
        return;
      }

      const method =
        {
          0.01: 'GET',
          0.02: 'POST',
          0.03: 'PUT',
          0.04: 'DELETE',
        }[parsed.code] || 'UNKNOWN';

      // Create a CoAP request-like object
      const req = {
        rsinfo: {
          address: socket?.remoteAddress,
          port: socket?.remotePort,
        },
        method: method,
        url: parsed?.url || '/',
        headers: {},
        payload: parsed?.payload,
        code: parsed?.code,
        //token: Buffer.from(parsed?.token),
        _packet: parsed,
        messageId: parsed?.messageId,
        ack: parsed?.ack,
        reset: parsed?.reset,
      };

      // Convert options to headers format
      if (parsed?.options) {
        parsed.options.forEach((opt) => {
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

      let res = {};
      try {
        // Create a CoAP response-like object
        res = {
          code: '2.05',
          payload: null,
          options: [],
          headers: {},
          token: Buffer.alloc(8),
          setToken: function (token) {
            token.copy(this.token);
          },
          setOption: function (name, values) {
            console.log(values);
            // Store options for response
            if (!Array.isArray(values)) {
              this.options.push({
                name: name,
                value: Buffer.from([values]),
              });
            } else {
              for (const value of values) {
                this.options.push({ name: name, value });
              }
            }
          },
          setHeader: function (name, value) {
            // Store headers for response
            this.headers[name] = value;
          },
          end: function (data) {
            // Send CoAP response back over DTLS
            try {
              const rspPacket = {
                code: this.code,
                token: Buffer.isBuffer(this.token)
                  ? this.token
                  : Buffer.from(this.token || ''),
                messageId: req.messageId,
                ack: true,
                options: this.options,
                headers: this.headers,
                payload: Buffer.isBuffer(data)
                  ? data
                  : Buffer.from(data || this.data || ''),
              };

              socket.write(packet.generate(rspPacket));
            } catch (error) {
              $.logger.error(
                `[Client] Failed to generate CoAP response over DTLS: ${error.message}`
              );
            }
          },
        };
      } catch (err) {
        console.log(err);
      }
      if (handler && typeof handler === 'function') {
        handler(req, res);
      }
    });

    socket.on('error', (err) => {
      $.logger.error(
        `[Client] DTLS socket error from ${socket.remoteAddress}:${socket.remotePort}: ${err}`
      );
    });

    socket.on('close', () => {
      $.logger.info(
        `[Client] DTLS connection closed from ${socket.remoteAddress}:${socket.remotePort}`
      );
    });
  });

  server.on('clientError', (err) => {
    $.logger.error(`[Client] DTLS client error: ${err}`);
  });

  server.on('error', (err) => {
    $.logger.error(`[Client] DTLS server error: ${err}`);
  });

  server.listen(port, () => {
    $.logger.info(
      `[Client] DTLS Resource server with Observe support on port ${port}`
    );
  });

  return server;
}

function sendDTLSCoapRequest(options, callback) {
  const methodMap = { GET: '0.01', POST: '0.02', PUT: '0.03', DELETE: '0.04' };
  const code = methodMap[(options.method || 'GET').toUpperCase()] || '0.01';

  const coapOptions = [];
  if (options.pathname) {
    options.pathname
      .split('/')
      .filter(Boolean)
      .forEach((segment) => {
        coapOptions.push({ name: 'Uri-Path', value: Buffer.from(segment) });
      });
  }
  if (options.query) {
    coapOptions.push({ name: 'Uri-Query', value: Buffer.from(options.query) });
  }
  if (Array.isArray(options.extraOptions)) {
    coapOptions.push(...options.extraOptions);
  }

  const coapReq = packet.generate({
    confirmable: true,
    messageId: Math.floor(Math.random() * 65535),
    token: options.token ? Buffer.from(options.token, 'hex') : Buffer.alloc(0),
    code,
    options: coapOptions,
    payload: options.payload ? Buffer.from(options.payload) : Buffer.alloc(0),
  });

  const timeout = setTimeout(() => {
    return callback(new Error('CoAP DTLS request timed out'));
  }, options.timeout || 1000);

  $.client.socket.once('message', (msg) => {
    clearTimeout(timeout);
    try {
      const parsed = packet.parse(msg);
      callback(null, parsed);
    } catch (err) {
      callback(new Error(`Failed to parse CoAP response: ${err.message}`));
    }
  });

  $.client.socket.send(coapReq);
}

function sendNotification(observer, path, value) {
  if (!$.client.registered) {
    return;
  }

  $.logger.info(`[Client] Sending DTLS notification for ${path}: ${value}`);

  // Convert options into CoAP options array additions
  const extraOptions = [
    { name: 'Observe', value: Buffer.from([observer.observeSeq & 0xff]) },
    { name: 'Content-Format', value: Buffer.from('text/plain') },
  ];

  sendDTLSCoapRequest(
    {
      method: 'GET', // notifications are sent as GET with Observe
      pathname: path.startsWith('/') ? path : '/' + path,
      token: observer?.token, // passed as string
      extraOptions, // new field for extra CoAP options
      payload: String(value),
      timeout: 2000,
    },
    (err, res) => {
      if (err) {
        $.logger.error(`[Client] Failed to send notification: ${err.message}`);
        return;
      }
      $.logger.info(
        `[Client] Notification sent, got response code ${res.code}`
      );
      if (res.payload?.length) {
        $.logger.debug(`[Client] Response payload: ${res.payload.toString()}`);
      }
    }
  );

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
  sendDTLSCoapRequest,
  sendNotification,
  stopObservation,
  getObservers,
  getServer,
};
