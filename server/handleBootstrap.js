// server/handleBootstrap.js
const { sendCoapRequest } = require('./transport/coapClient');
const PayloadCodec = require('../utils/payloadCodec');
const CONTENT_FORMATS = require('../utils/contentFormats');

/**
 * Bootstrap Configuration Store
 * In a real implementation, this would be stored in a database
 * or configuration management system
 */
const bootstrapConfigurations = new Map();

// Default bootstrap configuration
const defaultBootstrapConfig = {
  securityInstances: [
    {
      instanceId: 0,
      serverUri: 'coap://localhost:5683',
      isBootstrap: false,
      securityMode: 3, // NoSec
      shortServerId: 123
    }
  ],
  serverInstances: [
    {
      instanceId: 0, 
      shortServerId: 123,
      lifetime: 300,
      binding: 'U',
      notificationStoring: true
    }
  ]
};

/**
 * Handle bootstrap request from client
 */
function handleBootstrapRequest(req, res, bootstrapDeviceCall) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = new URLSearchParams(req.url.split('?')[1]);
      console.debug("query:",query)
      const ep = query.get('ep');
      const port = query.get('port');

      if (!ep) {
        res.code = '4.00';
        res.end('Missing ep parameter');
        return reject(new Error('Missing ep in bootstrap request'));
      }

      let config = null;

      if (typeof bootstrapDeviceCall === 'function') {
        try{
          config = await bootstrapDeviceCall({query:query, ep:ep});
        }catch(err){
          console.err(err);
        }
      }else{
        // Get or create bootstrap configuration for this endpoint
        config = bootstrapConfigurations.get(ep);
        if (!config) {
          // Use default config
          config = { ...defaultBootstrapConfig };
          bootstrapConfigurations.set(ep, config);
        }
      }

      //console.log("bootstrap client port:",req.rsinfo.port)

      // Store client info for provisioning
      const clientInfo = {
        address: req.rsinfo.address,
        //port: req.rsinfo.port || 56830, // Default client port
        port: port || 5683, // Default client port
        ep: ep,
        config: config
      };
      
      // Accept the bootstrap request
      res.code = '2.04';
      res.end();

      console.log(`[Bootstrap] Starting provisioning for client: ${ep}`);
      
      // Start the provisioning process
      setTimeout(() => {
        provisionClient(clientInfo)
          .then(() => {
            console.log(`[Bootstrap] Provisioning completed for client: ${ep}`);
          })
          .catch((err) => {
            console.error(`[Bootstrap] Provisioning failed for client: ${ep}: ${err.message}`);
          });
      }, 1000); // Give client time to process bootstrap response

      resolve({ ep });
    } catch (err) {
      res.code = '5.00';
      res.end('Bootstrap error');
      reject(err);
    }
  });
}

/**
 * Handle bootstrap finish notification
 */
function handleBootstrapFinish(req, res) {
  return new Promise((resolve, reject) => {
    try {
      const query = new URLSearchParams(req.url.split('?')[1]);
      const ep = query.get('ep');

      if (!ep) {
        res.code = '4.00';
        res.end('Missing ep parameter');
        return reject(new Error('Missing ep in bootstrap finish'));
      }

      console.log(`[Bootstrap] Client ${ep} finished bootstrap process`);

      res.code = '2.04';
      res.end();

      resolve({ ep });
    } catch (err) {
      res.code = '5.00';
      res.end('Bootstrap finish error');
      reject(err);
    }
  });
}

/**
 * Provision security and server objects to the client
 */
async function provisionClient(clientInfo) {
  const { address, port, ep, config } = clientInfo;

  try {
    
    // Step 1: Delete existing instances (clean slate)
    console.log(`[Bootstrap] Deleting existing security instances for ${ep}`);
    await deleteSecurityInstances(address, port);
    

    console.log(`[Bootstrap] Deleting existing server instances for ${ep}`);
    await deleteServerInstances(address, port);

    // Step 2: Create security object instances
    console.log(`[Bootstrap] Provisioning security objects for ${ep}`);
    for (const secInstance of config.securityInstances) {
      await createSecurityInstance(address, port, secInstance);
    }

    // Step 3: Create server object instances
    console.log(`[Bootstrap] Provisioning server objects for ${ep}`);
    for (const serverInstance of config.serverInstances) {
      await createServerInstance(address, port, serverInstance);
    }

    // Step 4: Send Bootstrap Finish
    console.log(`[Bootstrap] Sending bootstrap finish to ${ep}`);
    await sendBootstrapFinish(address, port);

    console.log(`[Bootstrap] Successfully provisioned client: ${ep}`);

  } catch (error) {
    console.error(`[Bootstrap] Provisioning failed: ${error.message}`);
    throw error;
  }
}

/**
 * Delete all security object instances
 */
async function deleteSecurityInstances(address, port) {
  try {
    const client = { address, port };
    const response = await sendCoapRequest(client, 'DELETE', '/0');
    if (!response.code.startsWith('2.')) {
      throw new Error(`Failed to delete security instances: ${response.code}`);
    }
  } catch (error) {
    // Ignore if object doesn't exist
    if (!error.message.includes('4.04')) {
      throw error;
    }
  }
}

/**
 * Delete all server object instances
 */
async function deleteServerInstances(address, port) {
  try {
    const client = { address, port };
    const response = await sendCoapRequest(client, 'DELETE', '/1');
    if (!response.code.startsWith('2.')) {
      throw new Error(`Failed to delete server instances: ${response.code}`);
    }
  } catch (error) {
    // Ignore if object doesn't exist
    if (!error.message.includes('4.04')) {
      throw error;
    }
  }
}

/**
 * Create a security object instance
 */
async function createSecurityInstance(address, port, instance) {
  const security = createSecurity(instance);
  const data = PayloadCodec.encode(security,CONTENT_FORMATS.cbor);

  const client = { address, port };
  
  const response = await sendCoapRequest(
    client, 
    'POST', 
    '/0', 
    data, 
    '', 
    { format: CONTENT_FORMATS.cbor }
  );

  if (!response.code.startsWith('2.')) {
    throw new Error(`Failed to create security instance: ${response.code}`);
  }
}

/**
 * Create a server object instance
 */
async function createServerInstance(address, port, instance) {
  const security = createServer(instance);
  const data = PayloadCodec.encode(security,CONTENT_FORMATS.cbor);

  const client = { address, port };
  
  const response = await sendCoapRequest(
    client, 
    'POST', 
    '/1', 
    data, 
    '', 
    { format: CONTENT_FORMATS.cbor }
  );

  if (!response.code.startsWith('2.')) {
    throw new Error(`Failed to create server instance: ${response.code}`);
  }
}

/**
 * Send Bootstrap Finish command
 */
async function sendBootstrapFinish(address, port) {
  const client = { address, port };
  const response = await sendCoapRequest(client, 'POST', '/bs');

  if (!response.code.startsWith('2.')) {
    throw new Error(`Bootstrap finish failed: ${response.code}`);
  }

}

/**
 * Create TLV data for security object
 */
function createSecurity(instance) {
  
  const resources = [
    { id: 0, value: instance.serverUri },           // LwM2M Server URI
    { id: 1, value: instance.isBootstrap },         // Bootstrap Server
    { id: 2, value: instance.securityMode },        // Security Mode
    { id: 10, value: instance.shortServerId }       // Short Server ID
  ];

  return resources;
}

/**
 * Create TLV data for server object
 */
function createServer(instance) {

  const resources = [
    { id: 0, value: instance.shortServerId },       // Short Server ID
    { id: 1, value: instance.lifetime },            // Lifetime
    { id: 6, value: instance.notificationStoring }, // Notification Storing
    { id: 7, value: instance.binding }              // Binding
  ];

  return resources;
}

/**
 * Set bootstrap configuration for a specific endpoint
 */
function setBootstrapConfiguration(ep, config) {
  bootstrapConfigurations.set(ep, config);
}

/**
 * Get bootstrap configuration for a specific endpoint
 */
function getBootstrapConfiguration(ep) {
  return bootstrapConfigurations.get(ep) || { ...defaultBootstrapConfig };
}

module.exports = {
  handleBootstrapRequest,
  handleBootstrapFinish,
  setBootstrapConfiguration,
  getBootstrapConfiguration,
  defaultBootstrapConfig
};