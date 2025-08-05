// client/bootstrap.js - Bootstrap client functionality
const coap = require('coap');

/**
 * Perform bootstrap request to bootstrap server
 */
function requestBootstrap(endpointName, bootstrapHost, bootstrapPort = 5684, localPort = 5683) {
  return new Promise((resolve, reject) => {
    const agent = new coap.Agent();

    const req = coap.request({
      hostname: bootstrapHost,
      port: bootstrapPort,
      pathname: '/bs',
      method: 'POST',
      query: `ep=${endpointName}&port=${localPort}`,
      agent
    });

    let timeout = setInterval(()=>{
      reject(new Error('No response from bootstrap server'));
    },2000);

    req.on('response', (res) => {
      clearInterval(timeout);
      if (res.code !== '2.04') {
        $.logger.error(`[Bootstrap Client] Bootstrap request failed: ${res.code}`);
        return reject(new Error(`Bootstrap failed: ${res.code} ${res.payload.toString()}`));
      }

      $.logger.info(`[Bootstrap Client] Bootstrap request accepted`);
      resolve();
    });

    req.on('error', (err) => {
      clearInterval(timeout);
      $.logger.error(`[Bootstrap Client] Bootstrap request error: ${err.message}`);
      reject(err);
    });

    req.end();
  });
}

/**
 * Send bootstrap finish notification
 */
function sendBootstrapFinish(endpointName, bootstrapHost, bootstrapPort = 5684) {
  return new Promise((resolve, reject) => {
    const agent = new coap.Agent();

    const req = coap.request({
      hostname: bootstrapHost,
      port: bootstrapPort,
      pathname: '/bs-finish',
      method: 'POST',
      query: `ep=${endpointName}`,
      agent
    });

    let timeout = setInterval(()=>{
      reject(new Error('No response from bootstrap server'));
    },2000);

    req.on('response', (res) => {
      clearInterval(timeout);
      if (res.code !== '2.04') {
        $.logger.error(`[Bootstrap Client] Bootstrap finish failed: ${res.code}`);
        return reject(new Error(`Bootstrap finish failed: ${res.code} ${res.payload.toString()}`));
      }

      $.logger.info(`[Bootstrap Client] Bootstrap finish acknowledged`);
      resolve();
    });

    req.on('error', (err) => {
      clearInterval(timeout);
      $.logger.error(`[Bootstrap Client] Bootstrap finish error: ${err.message}`);
      reject(err);
    });

    req.end();
  });
}

/**
 * Wait for bootstrap provisioning to complete
 * The bootstrap server will provision security and server objects
 */
function waitForProvisioning(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let provisioningComplete = false;
    
    const timeout = setTimeout(() => {
      if (!provisioningComplete) {
        reject(new Error('Bootstrap provisioning timeout'));
      }
    }, timeoutMs);

    // Monitor for bootstrap finish message from server
    const checkProvisioning = setInterval(() => {
      // In a real implementation, this would check if all required
      // security and server objects have been provisioned
      // For now, we'll simulate with a simple timeout
      $.logger.info("provisioned:",$.client.provisioned)
      if($.client.provisioned){
        // check if securityObject and serverObject are defined - objects
        if (true){ //securityObject && serverObject) {
          provisioningComplete = true;
          clearTimeout(timeout);
          clearInterval(checkProvisioning);
          $.logger.info('[Bootstrap Client] Provisioning completed');
          resolve();
        }else{
          $.logger.warn('[Bootstrap Client] Security and Server are not defined');
          $.logger.error('[Bootstrap Client] Retry provisioning..');
          sys.exit();
        }
      }else{
        $.logger.info('[Bootstrap Client] Waiting for provisioning');
      }
      
    }, 500);

    // Fallback: assume provisioning is complete after 5 seconds
    setTimeout(() => {
      if (!provisioningComplete) {
        provisioningComplete = true;
        clearTimeout(timeout);
        clearInterval(checkProvisioning);
        $.logger.info('[Bootstrap Client] Provisioning completed (timeout fallback)');
        resolve();
      }
    }, 15000);
  });
}

/**
 * Perform full bootstrap sequence
 */
async function performBootstrap(endpointName, bootstrapHost, bootstrapPort = 5684, localPort = 5683) {
  try {
    $.logger.info(`[Bootstrap Client] Starting bootstrap sequence for ${endpointName}`);
    
    // Step 1: Request bootstrap
    await requestBootstrap(endpointName, bootstrapHost, bootstrapPort, localPort);
    
    // Step 2: Wait for provisioning
    await waitForProvisioning();
    
    // Step 3: Send bootstrap finish
    await sendBootstrapFinish(endpointName, bootstrapHost, bootstrapPort);
    
    $.logger.info(`[Bootstrap Client] Bootstrap sequence completed successfully`);
    return true;
  } catch (error) {
    $.logger.error(`[Bootstrap Client] Bootstrap sequence failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  requestBootstrap,
  sendBootstrapFinish,
  waitForProvisioning,
  performBootstrap
};