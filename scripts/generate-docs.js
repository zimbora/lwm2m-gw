#!/usr/bin/env node

/**
 * Documentation Generator for LwM2M Gateway
 * 
 * Generates API documentation for functions exported from index.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Documentation data structure
const apiDocs = {
  server: {
    bootstrap: {
      description: 'LwM2M Bootstrap Server for device provisioning and initial configuration',
      functions: [
        {
          name: 'startBootstrapServer',
          signature: 'startBootstrapServer(bootstrapDeviceCall = null, port = 5783)',
          description: 'Starts the LwM2M Bootstrap Server',
          parameters: [
            { name: 'bootstrapDeviceCall', type: 'function|null', description: 'Optional callback for custom bootstrap handling' },
            { name: 'port', type: 'number', description: 'Port to listen on (default: 5783)' }
          ],
          returns: { type: 'object', description: 'CoAP server instance' }
        }
      ]
    },
    handleBootstrap: {
      description: 'Bootstrap request handling and device configuration management',
      functions: [
        {
          name: 'handleBootstrapRequest',
          signature: 'handleBootstrapRequest(req, res, bootstrapDeviceCall)',
          description: 'Processes bootstrap requests from LwM2M clients',
          parameters: [
            { name: 'req', type: 'object', description: 'CoAP request object' },
            { name: 'res', type: 'object', description: 'CoAP response object' },
            { name: 'bootstrapDeviceCall', type: 'function', description: 'Custom bootstrap handler' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to { ep }' }
        },
        {
          name: 'handleBootstrapFinish',
          signature: 'handleBootstrapFinish(req, res)',
          description: 'Handles bootstrap finish notifications',
          parameters: [
            { name: 'req', type: 'object', description: 'CoAP request object' },
            { name: 'res', type: 'object', description: 'CoAP response object' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to { ep }' }
        },
        {
          name: 'setBootstrapConfiguration',
          signature: 'setBootstrapConfiguration(ep, config)',
          description: 'Sets bootstrap configuration for a specific endpoint',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'config', type: 'object', description: 'Bootstrap configuration object' }
          ],
          returns: { type: 'void', description: 'No return value' }
        },
        {
          name: 'getBootstrapConfiguration',
          signature: 'getBootstrapConfiguration(ep)',
          description: 'Gets bootstrap configuration for an endpoint',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' }
          ],
          returns: { type: 'object', description: 'Bootstrap configuration object' }
        }
      ]
    },
    resourceClient: {
      description: 'Client management and resource operations for LwM2M server',
      functions: [
        {
          name: 'startLwM2MCoapServer',
          signature: 'startLwM2MCoapServer(validation, port, options = {})',
          description: 'Starts LwM2M CoAP server for client communication',
          parameters: [
            { name: 'validation', type: 'function', description: 'Client validation function' },
            { name: 'port', type: 'number', description: 'Port to listen on' },
            { name: 'options', type: 'object', description: 'Server configuration options' }
          ],
          returns: { type: 'object', description: 'CoAP server instance' }
        },
        {
          name: 'startLwM2MDTLSCoapServer',
          signature: 'startLwM2MDTLSCoapServer(validation, port, options = {})',
          description: 'Starts LwM2M DTLS CoAP server for secure communication',
          parameters: [
            { name: 'validation', type: 'function', description: 'Client validation function' },
            { name: 'port', type: 'number', description: 'Port to listen on' },
            { name: 'options', type: 'object', description: 'DTLS server configuration options' }
          ],
          returns: { type: 'object', description: 'DTLS server instance' }
        },
        {
          name: 'discoveryRequest',
          signature: 'discoveryRequest(ep)',
          description: 'Sends discovery request to client to enumerate resources',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to discovery response' }
        },
        {
          name: 'getRequest',
          signature: 'getRequest(ep, path, format = "text")',
          description: 'Sends GET request to client resource',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path (e.g., "/3/0/0")' },
            { name: 'format', type: 'string', description: 'Response format (text, json, cbor, tlv)' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to resource value' }
        },
        {
          name: 'startObserveRequest',
          signature: 'startObserveRequest(ep, path, format = "text")',
          description: 'Starts observing a client resource for changes',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path to observe' },
            { name: 'format', type: 'string', description: 'Notification format' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to observation setup' }
        },
        {
          name: 'stopObserveRequest',
          signature: 'stopObserveRequest(ep, path)',
          description: 'Stops observing a client resource',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path to stop observing' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to stop confirmation' }
        },
        {
          name: 'putRequest',
          signature: 'putRequest(ep, path, payload, format = "text")',
          description: 'Sends PUT request to update client resource',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path to update' },
            { name: 'payload', type: 'any', description: 'New resource value' },
            { name: 'format', type: 'string', description: 'Payload format' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to update response' }
        },
        {
          name: 'postRequest',
          signature: 'postRequest(ep, path, payload, format = "text")',
          description: 'Sends POST request to execute resource or create instance',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path' },
            { name: 'payload', type: 'any', description: 'Request payload' },
            { name: 'format', type: 'string', description: 'Payload format' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to execution response' }
        },
        {
          name: 'deleteRequest',
          signature: 'deleteRequest(ep, path)',
          description: 'Sends DELETE request to remove resource instance',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path to delete' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to deletion response' }
        },
        {
          name: 'createRequest',
          signature: 'createRequest(ep, parentPath, payload, format = "text")',
          description: 'Creates new object instance',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'parentPath', type: 'string', description: 'Parent object path' },
            { name: 'payload', type: 'any', description: 'Instance data' },
            { name: 'format', type: 'string', description: 'Payload format' }
          ],
          returns: { type: 'Promise<object>', description: 'Promise resolving to creation response' }
        }
      ]
    },
    clientRegistry: {
      description: 'Client registration and session management',
      functions: [
        {
          name: 'registerClient',
          signature: 'registerClient(ep, info)',
          description: 'Registers a new LwM2M client',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'info', type: 'object', description: 'Client information object' }
          ],
          returns: { type: 'void', description: 'No return value' }
        },
        {
          name: 'getClient',
          signature: 'getClient(ep)',
          description: 'Retrieves client information by endpoint',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' }
          ],
          returns: { type: 'object|null', description: 'Client information or null if not found' }
        },
        {
          name: 'listClients',
          signature: 'listClients()',
          description: 'Returns list of all registered clients',
          parameters: [],
          returns: { type: 'Array<object>', description: 'Array of client information objects' }
        },
        {
          name: 'deregisterClient',
          signature: 'deregisterClient(ep)',
          description: 'Removes client from registry',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' }
          ],
          returns: { type: 'boolean', description: 'True if client was removed' }
        }
      ]
    },
    observationRegistry: {
      description: 'Resource observation management',
      functions: [
        {
          name: 'registerObservation',
          signature: 'registerObservation(ep, path, token, socket)',
          description: 'Registers a new resource observation',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path' },
            { name: 'token', type: 'string', description: 'Observation token' },
            { name: 'socket', type: 'object', description: 'Socket for notifications' }
          ],
          returns: { type: 'void', description: 'No return value' }
        },
        {
          name: 'getObservation',
          signature: 'getObservation(ep, path)',
          description: 'Gets observation details for a resource',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path' }
          ],
          returns: { type: 'object|null', description: 'Observation details or null' }
        },
        {
          name: 'deregisterObservation',
          signature: 'deregisterObservation(ep, path)',
          description: 'Removes resource observation',
          parameters: [
            { name: 'ep', type: 'string', description: 'Endpoint name' },
            { name: 'path', type: 'string', description: 'Resource path' }
          ],
          returns: { type: 'boolean', description: 'True if observation was removed' }
        }
      ]
    },
    sharedEmitter: {
      description: 'Shared EventEmitter for server-wide events',
      functions: [
        {
          name: 'emit',
          signature: 'emit(event, ...args)',
          description: 'Emits an event to all listeners',
          parameters: [
            { name: 'event', type: 'string', description: 'Event name' },
            { name: '...args', type: 'any', description: 'Event arguments' }
          ],
          returns: { type: 'boolean', description: 'True if event had listeners' }
        },
        {
          name: 'on',
          signature: 'on(event, listener)',
          description: 'Adds event listener',
          parameters: [
            { name: 'event', type: 'string', description: 'Event name' },
            { name: 'listener', type: 'function', description: 'Event listener function' }
          ],
          returns: { type: 'EventEmitter', description: 'EventEmitter instance for chaining' }
        }
      ]
    }
  },
  client: {
    resourceServer: {
      description: 'LwM2M client resource server implementation',
      functions: [
        {
          name: 'startResourceServer',
          signature: 'startResourceServer(port)',
          description: 'Starts the LwM2M client resource server',
          parameters: [
            { name: 'port', type: 'number', description: 'Port to listen on' }
          ],
          returns: { type: 'object', description: 'CoAP server instance' }
        }
      ]
    },
    registration: {
      description: 'LwM2M client registration management',
      functions: [
        {
          name: 'registerToServer',
          signature: 'registerToServer(endpointName, serverHost, serverPort, localPort = 5683, timeoutMs = 1000, protocol = "coap")',
          description: 'Registers client with LwM2M server',
          parameters: [
            { name: 'endpointName', type: 'string', description: 'Client endpoint name' },
            { name: 'serverHost', type: 'string', description: 'Server hostname or IP' },
            { name: 'serverPort', type: 'number', description: 'Server port' },
            { name: 'localPort', type: 'number', description: 'Local client port (default: 5683)' },
            { name: 'timeoutMs', type: 'number', description: 'Request timeout in milliseconds (default: 1000)' },
            { name: 'protocol', type: 'string', description: 'Protocol to use: "coap" or "coaps" (default: "coap")' }
          ],
          returns: { type: 'Promise<void>', description: 'Promise that resolves when registration is complete' }
        },
        {
          name: 'updateRegistration',
          signature: 'updateRegistration(host, port, protocol = "coap")',
          description: 'Sends registration update to server',
          parameters: [
            { name: 'host', type: 'string', description: 'Server hostname or IP' },
            { name: 'port', type: 'number', description: 'Server port' },
            { name: 'protocol', type: 'string', description: 'Protocol to use (default: "coap")' }
          ],
          returns: { type: 'Promise<void>', description: 'Promise that resolves when update is complete' }
        },
        {
          name: 'deregister',
          signature: 'deregister(host, port, protocol = "coap")',
          description: 'Deregisters client from server',
          parameters: [
            { name: 'host', type: 'string', description: 'Server hostname or IP' },
            { name: 'port', type: 'number', description: 'Server port' },
            { name: 'protocol', type: 'string', description: 'Protocol to use (default: "coap")' }
          ],
          returns: { type: 'Promise<void>', description: 'Promise that resolves when deregistration is complete' }
        }
      ]
    },
    logger: {
      description: 'Pino logger instance for client operations',
      functions: [
        {
          name: 'debug',
          signature: 'debug(message, ...args)',
          description: 'Logs debug message',
          parameters: [
            { name: 'message', type: 'string', description: 'Log message' },
            { name: '...args', type: 'any', description: 'Additional arguments' }
          ],
          returns: { type: 'void', description: 'No return value' }
        },
        {
          name: 'info',
          signature: 'info(message, ...args)',
          description: 'Logs info message',
          parameters: [
            { name: 'message', type: 'string', description: 'Log message' },
            { name: '...args', type: 'any', description: 'Additional arguments' }
          ],
          returns: { type: 'void', description: 'No return value' }
        },
        {
          name: 'error',
          signature: 'error(message, ...args)',
          description: 'Logs error message',
          parameters: [
            { name: 'message', type: 'string', description: 'Log message' },
            { name: '...args', type: 'any', description: 'Additional arguments' }
          ],
          returns: { type: 'void', description: 'No return value' }
        }
      ]
    }
  }
};

// HTML template for documentation
function generateHTML(version, apiDocs) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LwM2M Gateway API Documentation v${version}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fafafa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
        }
        .version {
            opacity: 0.9;
            font-size: 1.2rem;
            margin-top: 0.5rem;
        }
        .toc {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .toc h2 {
            margin-top: 0;
            color: #667eea;
        }
        .toc ul {
            margin: 0;
            padding-left: 1.5rem;
        }
        .toc li {
            margin: 0.5rem 0;
        }
        .toc a {
            color: #667eea;
            text-decoration: none;
        }
        .toc a:hover {
            text-decoration: underline;
        }
        .section {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
            margin-top: 0;
        }
        .module {
            margin-bottom: 2rem;
        }
        .module h3 {
            color: #764ba2;
            background: #f8f9ff;
            padding: 1rem;
            border-radius: 6px;
            margin: 0 0 1rem 0;
        }
        .module-description {
            font-style: italic;
            color: #666;
            margin-bottom: 1.5rem;
        }
        .function {
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            background: #fafbfc;
        }
        .function h4 {
            margin: 0 0 1rem 0;
            color: #333;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #f1f3f4;
            padding: 0.5rem;
            border-radius: 4px;
        }
        .function-description {
            margin-bottom: 1rem;
        }
        .parameters {
            margin-bottom: 1rem;
        }
        .parameters h5, .returns h5 {
            margin: 0 0 0.5rem 0;
            color: #555;
        }
        .parameter {
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
        }
        .parameter-name {
            font-weight: bold;
            color: #667eea;
        }
        .parameter-type {
            color: #764ba2;
            font-family: monospace;
            font-size: 0.9em;
        }
        .returns {
            background: #f0f8f0;
            border: 1px solid #d4edda;
            border-radius: 4px;
            padding: 0.75rem;
        }
        .footer {
            text-align: center;
            color: #666;
            margin-top: 3rem;
            padding: 2rem;
            border-top: 1px solid #ddd;
        }
        code {
            background: #f1f3f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LwM2M Gateway API Documentation</h1>
        <div class="version">Version ${version}</div>
    </div>

    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
            <li><a href="#server">Server API</a>
                <ul>
                    ${Object.keys(apiDocs.server).map(module => 
                        `<li><a href="#server-${module}">${module}</a></li>`
                    ).join('')}
                </ul>
            </li>
            <li><a href="#client">Client API</a>
                <ul>
                    ${Object.keys(apiDocs.client).map(module => 
                        `<li><a href="#client-${module}">${module}</a></li>`
                    ).join('')}
                </ul>
            </li>
        </ul>
    </div>

    <div class="section" id="server">
        <h2>Server API</h2>
        <p>The server API provides functionality for running LwM2M servers, managing client connections, and handling resource operations.</p>
        
        ${Object.entries(apiDocs.server).map(([moduleName, moduleData]) => `
            <div class="module" id="server-${moduleName}">
                <h3>${moduleName}</h3>
                <div class="module-description">${moduleData.description}</div>
                
                ${moduleData.functions.map(func => `
                    <div class="function">
                        <h4>${func.signature}</h4>
                        <div class="function-description">${func.description}</div>
                        
                        ${func.parameters.length > 0 ? `
                            <div class="parameters">
                                <h5>Parameters:</h5>
                                ${func.parameters.map(param => `
                                    <div class="parameter">
                                        <span class="parameter-name">${param.name}</span>
                                        <span class="parameter-type">(${param.type})</span>
                                        - ${param.description}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="returns">
                            <h5>Returns:</h5>
                            <span class="parameter-type">${func.returns.type}</span> - ${func.returns.description}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>

    <div class="section" id="client">
        <h2>Client API</h2>
        <p>The client API provides functionality for implementing LwM2M clients that can register with servers and expose resources.</p>
        
        ${Object.entries(apiDocs.client).map(([moduleName, moduleData]) => `
            <div class="module" id="client-${moduleName}">
                <h3>${moduleName}</h3>
                <div class="module-description">${moduleData.description}</div>
                
                ${moduleData.functions.map(func => `
                    <div class="function">
                        <h4>${func.signature}</h4>
                        <div class="function-description">${func.description}</div>
                        
                        ${func.parameters.length > 0 ? `
                            <div class="parameters">
                                <h5>Parameters:</h5>
                                ${func.parameters.map(param => `
                                    <div class="parameter">
                                        <span class="parameter-name">${param.name}</span>
                                        <span class="parameter-type">(${param.type})</span>
                                        - ${param.description}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="returns">
                            <h5>Returns:</h5>
                            <span class="parameter-type">${func.returns.type}</span> - ${func.returns.description}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>Generated automatically from <code>index.js</code> exports</p>
        <p>LwM2M Gateway v${version} - <a href="https://github.com/zimbora/lwm2m-gw">GitHub Repository</a></p>
    </div>
</body>
</html>`;
}

// Generate documentation
function generateDocs() {
  console.log(`Generating documentation for version ${version}...`);
  
  // Create docs directory structure
  const docsDir = path.join('docs', 'api');
  const versionDir = path.join(docsDir, version);
  
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }
  
  // Generate HTML documentation
  const html = generateHTML(version, apiDocs);
  fs.writeFileSync(path.join(versionDir, 'index.html'), html);
  
  // Create/update latest symlink or copy
  const latestDir = path.join(docsDir, 'latest');
  if (fs.existsSync(latestDir)) {
    fs.rmSync(latestDir, { recursive: true, force: true });
  }
  fs.mkdirSync(latestDir, { recursive: true });
  fs.writeFileSync(path.join(latestDir, 'index.html'), html);
  
  // Generate index page that lists all versions
  const versions = fs.readdirSync(docsDir).filter(dir => 
    fs.statSync(path.join(docsDir, dir)).isDirectory() && dir !== 'latest'
  ).sort((a, b) => {
    // Sort versions in descending order
    const parseVersion = v => v.split('.').map(Number);
    const aVer = parseVersion(a);
    const bVer = parseVersion(b);
    for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
      const aDiff = (aVer[i] || 0) - (bVer[i] || 0);
      if (aDiff !== 0) return -aDiff; // Negative for descending order
    }
    return 0;
  });
  
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LwM2M Gateway Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fafafa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            text-align: center;
        }
        .versions {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .version-link {
            display: block;
            padding: 1rem;
            margin: 0.5rem 0;
            background: #f8f9ff;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            text-decoration: none;
            color: #667eea;
            transition: all 0.2s;
        }
        .version-link:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .latest {
            background: #d4edda;
            border-color: #c3e6cb;
        }
        .latest:hover {
            background: #28a745;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LwM2M Gateway Documentation</h1>
        <p>Choose a version to view the API documentation</p>
    </div>
    
    <div class="versions">
        <h2>Available Versions</h2>
        <a href="latest/" class="version-link latest">
            <strong>Latest (v${version})</strong>
        </a>
        ${versions.map(ver => `
            <a href="${ver}/" class="version-link">
                Version ${ver}
            </a>
        `).join('')}
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(docsDir, 'index.html'), indexHtml);
  
  console.log(`Documentation generated successfully!`);
  console.log(`- Version ${version}: docs/api/${version}/index.html`);
  console.log(`- Latest: docs/api/latest/index.html`);
  console.log(`- Index: docs/api/index.html`);
}

// Run if called directly
if (require.main === module) {
  generateDocs();
}

module.exports = { generateDocs };