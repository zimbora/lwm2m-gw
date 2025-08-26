// client/dtlsResourceServer.js

const {
  createServer,
  sendNotification,
  stopObservation,
  getObservers,
} = require('./transport/dtlsServer');

const { getResource, getResourceSet } = require('./objects');

const {
  handleDiscoveryRequest,
  handleGetRequest,
  handlePutRequest,
  handlePostRequest,
  handleDeleteRequest,
  handleCreateRequest,
  handleProvisionCompleted,
} = require('./routes');

function startDtlsResourceServer(port = 56830, dtlsOptions = {}) {
  const observers = getObservers();

  const server = createServer(
    (req, res) => {
      if (req.method === 'GET' && req.url === '/.well-known/core') {
        return handleDiscoveryRequest(res);
      }

      $.logger.info(`DTLS method:${req.method} url:${req.url}`);
      let path = Array.isArray(req.url) ? req.url.join('/') : req.url;
      path = (path || '').replace(/^\/+/, '');
      const segments = path.split('/');
      const [objectId, instanceId, resourceId] = segments.map(Number);

      // Bootstrap methods
      if (req.method === 'POST' && req.url === '/bs') {
        return handleProvisionCompleted(req, res);
      } else if (req.method === 'POST' && segments.length === 1) {
        return handleCreateRequest(req, res, { objectId });
      } else if (req.method === 'POST' && segments.length === 2) {
        return handleCreateRequest(req, res, { objectId, instanceId });
      }

      $.logger.info('DTLS get resource:', objectId, instanceId, resourceId);
      const resource = getResource(objectId, instanceId, resourceId);

      if (!resource) {
        res.code = '4.04';
        return res.end('Resource not found');
      }

      if (req.method === 'GET') {
        return handleGetRequest(req, res, {
          objectId,
          instanceId,
          resourceId,
          resource,
          observers,
          path,
        });
      } else if (req.method === 'PUT') {
        return handlePutRequest(req, res, {
          objectId,
          instanceId,
          resourceId,
          resource,
          observers,
          path,
        });
      } else if (req.method === 'POST') {
        return handlePostRequest(req, res, {
          objectId,
          instanceId,
          resourceId,
          resource,
        });
      } else if (req.method === 'DELETE') {
        return handleDeleteRequest(req, res, {
          objectId,
          instanceId,
          resourceId,
          resource,
        });
      } else {
        res.code = '4.05';
        res.end('method not implemented');
      }
    },
    port,
    dtlsOptions
  );

  return server;
}

module.exports = { startDtlsResourceServer };
