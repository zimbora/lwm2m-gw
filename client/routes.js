// client/routes.js
const crypto = require('crypto');

let sendNotification, stopObservation;
if ($.protocol === 'coaps') {
  ({ sendNotification, stopObservation } = require('./transport/dtlsServer'));
} else {
  ({ sendNotification, stopObservation } = require('./transport/coapServer'));
}
const { encodeResourcesToCBOR, decodeCBOR } = require('../utils/cbor');
const { encodeTLV, decodeTLV } = require('../utils/tlv');
const PayloadCodec = require('../utils/payloadCodec');
const CONTENT_FORMATS = require('../utils/contentFormats');
const { getObjectModule,getResource,getResourceSet, addInstance } = require('./objects');

function handleDiscoveryRequest(res) {
  const links = [];
  const objectIds = [0, 1, 2, 3, 4, 5, 6, 3303];

  for (const objectId of objectIds) {
    const instanceId = 0;
    const resources = getResourceSet(objectId, instanceId);
    if (!resources) continue;

    for (const [resourceId, resDef] of Object.entries(resources)) {
      const parts = [`</${objectId}/${instanceId}/${resourceId}>`];

      if (resDef.name) parts.push(`title="${resDef.name}"`);
      if (resDef.type) parts.push(`type="${resDef.type}"`);
      if (resDef.readable) parts.push('readable');
      if (resDef.writable) parts.push('writable');
      if (resDef.executable) parts.push('executable');
      if (resDef.observable) parts.push('obs');
      if (resDef.units) parts.push(`units="${resDef.units}"`);
      if (resDef.rt) parts.push(`rt="${resDef.rt}"`);
      if (resDef.iface) parts.push(`if="${resDef.iface}"`);

      links.push(parts.join(';'));
    }
  }

  res.setOption('Content-Format', 'application/link-format');
  res.code = '2.05';
  res.end(links.join(','));
}

function handleGetRequest(req, res, { objectId, instanceId, resourceId, resource, observers, path }) {
  const value = typeof resource.value === 'function' ? resource.value() : resource.value;
  if (req.headers?.observe !== undefined || req.headers?.Observe !== undefined) {
    if (!resource?.observable) {
      res.code = '4.05';
      return res.end('Observe not allowed');
    }

    console.log(req.headers);
    let Observe = null;
    if (req.headers?.observe != null){
      Observe = req.headers.observe;
    }else if(req.headers?.Observe != null){
      Observe = req.headers.Observe;
    }

    function bufferToNumber(buf) {
      let num = 0;
      for (let i = 0; i < buf.length; i++) {
        num = (num << 8) | buf[i]; // big-endian
      }
      return num;
    }
    
    Observe = Buffer.isBuffer(Observe) ? bufferToNumber(Observe) : Observe;

    if (Observe == 0) {
      $.logger.info(`start observation for:${objectId}/${instanceId}/${resourceId}`);
      res.setOption('Observe', 0);
      const token = crypto.randomBytes(12);
      res.setToken(token);
      res.end(String(value));

      if (!observers[path]) observers[path] = [];
      
      observers[path].push({
        address: req.rsinfo.address,
        port: 5683,
        token: token,
        observeSeq: 1,
      });
      
      if (!resource._interval) {
        resource._interval = setInterval(() => {
          const val = resource.value;
          if (!observers[path] || observers[path].length === 0) {
            stopObservation(resource);
            return;
          }
          observers[path] = observers[path].filter((observer) => {
            try {
              sendNotification(observer, path, val);
              return true;
            } catch {
              return false;
            }
          });
        }, 2000);
      }
    } else {
      stopObservation(resource);
      res.code = '2.05';
      return res.end('Observation stopped');
    }
  } else {
    if (!resource.readable) {
      res.code = '4.05';
      return res.end('Read not allowed');
    }

    const accept = req.headers.Accept;

    if (accept === CONTENT_FORMATS.cbor || accept == 62) {
      const encoded = PayloadCodec.encode({ [resourceId]: resource },CONTENT_FORMATS.cbor);
      res.setOption('Content-Format', CONTENT_FORMATS.cbor);
      res.end(encoded);
    } else if (accept === CONTENT_FORMATS.tlv || accept == 60) {
      const encoded = PayloadCodec.encode({resourceId, value},CONTENT_FORMATS.tlv);
      res.setOption('Content-Format', CONTENT_FORMATS.tlv);
      res.end(encoded);
    } else {
      res.end(String(value));
    }
  }
}

function handlePutRequest(req, res, { objectId, instanceId, resourceId, resource, observers, path }) {
  if (!resource.writable) {
    res.code = '4.05';
    return res.end('Write not allowed');
  }

  const format = req.headers['Content-Format'];
  const resources = getResourceSet(objectId, instanceId);

  if (format === CONTENT_FORMATS.cbor || format == 62) {
    PayloadCodec.decode(req.payload,CONTENT_FORMATS.cbor).then(decoded => {
      for (const [id, val] of Object.entries(decoded)) {
        if (resources[id]?.writable) resources[id].value = val;
      }
      res.code = '2.04';
      res.end();
    }).catch(() => {
      res.code = '4.00';
      res.end('Bad CBOR');
    });
  } else if (format === CONTENT_FORMATS.tlv || format == 60) {
    try {
      const decoded = PayloadCodec.decode(req.payload,CONTENT_FORMATS.tlv);
      for (const [id, val] of Object.entries(decoded)) {
        if (resources[id]?.writable) resources[id].value = val;
      }
      res.code = '2.04';
      res.end();
    } catch {
      res.code = '4.00';
      res.end('Bad TLV');
    }
  } else {
    const newValue = req.payload.toString();

    if(resource.type != 'string')
      resource.value = Number(newValue);
    else
      resource.value = newValue;

    res.code = '2.04';
    res.end();

    /* value has changed. 
    * If there is an observer for that path, 
    * send a notification with new value
    */
    if (observers[path]) {
      observers[path].forEach(observer => {
        try {
          sendNotification(observer, path, newValue);
        } catch {}
      });
    }
  }
}

function handlePostRequest(req, res, { resource }) {
  if (typeof resource?.execute === 'function') {
    resource.execute();
    res.code = '2.04';
  } else {
    res.code = '4.05';
  }
  res.end();
}

function handleDeleteRequest(req, res, { objectId, instanceId, resourceId, resource }) {
  
  // Perform the deletion logic here, e.g. remove resource or clear its value
  // This depends on your resource structure
  // For demonstration, just set value to null:
  $.logger.info("handling Delete Request")

  if (!resourceId && resource) {
    Object.keys(resource).forEach((key) => {
      if(resource[key]?.value){
        resource[key].value = null;
        res.code = '2.02';
      }
    });

  }else if(resource){
    if(resource?.deletable && resource?.value){
      resource.value = null;
      res.code = '2.02'; // Deleted
    }else{
      res.code = '4.05'; // Method Not Allowed
      return res.end('Delete not allowed');
    }
  }else{
    res.code = '4.05'; // Method Not Allowed
    return res.end('Object or resource not valid');
  }

  res.end();
}

function handleCreateRequest(req, res, { objectId, newInstanceId }) {

  $.logger.info(`handling Creating Request ${objectId}/${newInstanceId}`);

  const format = req.headers['Content-Format'];

  let instanceId = null;
  try{
    instanceId = addInstance(objectId,newInstanceId)
  }catch(err){
    res.code = '5.04';
    return res.end(`Object not available or couldn't create a new instance`);
  }

  let instance = null;
  try{
    instance = getResource(objectId,instanceId);
  }catch(err){
    res.code = '5.04';
    return res.end(`Error getting new instance`);
  }

  if (format === CONTENT_FORMATS.cbor || format == 62 ) {
    return PayloadCodec.decode(req.payload,CONTENT_FORMATS.cbor).then(decoded => {
      // Assuming decoded is an object like { resourceId: { value: ... }, ... }
      Object.entries(decoded).forEach(([key]) => {
        if (instance && instance[key] && instance[key].hasOwnProperty("value")) {
          // Update the resource's value
          instance[key].value = decoded[key];
        }
      });
      res.code = '2.01'; // Created or updated
      res.setOption('Location-Path', `/${objectId}/${newInstanceId}`);
      res.end();
    }).catch(() => {
      res.code = '4.00';
      res.end('Bad CBOR');
    });
  }

  if (format === CONTENT_FORMATS.tlv || format == 60) {
    return PayloadCodec.decode(req.payload,CONTENT_FORMATS.tlv).then(decoded => {
      // Assuming decoded is an object like { resourceId: { value: ... }, ... }
      Object.entries(decoded).forEach(([key]) => {
        if (instance && instance[key] && instance[key].hasOwnProperty("value")) {
          // Update the resource's value
          instance[key].value = decoded[key];
        }
      });
      res.code = '2.01'; // Created or updated
      res.setOption('Location-Path', `/${objectId}/${newInstanceId}`);
      res.end();
    }).catch(() => {
      res.code = '4.00';
      res.end('Bad TLV');
    });
  } else {
    res.code = '4.15';
    return res.end('Unsupported content format');
  }
  
}

function handleProvisionCompleted(req, res) {

  $.client.provisioned = true;

  res.code = '2.01'; // Completed
  return res.end();
}

module.exports = { 
  handleDiscoveryRequest, 
  handleGetRequest, 
  handlePutRequest, 
  handlePostRequest, 
  handleDeleteRequest,
  handleCreateRequest,
  handleProvisionCompleted
};
