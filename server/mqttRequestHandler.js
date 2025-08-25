// server/mqttRequestHandler.js

const mqtt = require('mqtt');
const { 
  discoveryRequest,
  getRequest,
  startObserveRequest,
  stopObserveRequest,
  putRequest,
  postRequest,
  deleteRequest,
  createRequest,
} = require('./resourceClient');

/**
 * MQTT Request Handler for LwM2M Server
 * 
 * This module handles incoming MQTT requests and forwards them to LwM2M devices.
 * 
 * Topic Structure:
 * - Incoming requests: {project}/requests/{endpoint}/{method}{path}
 * - Outgoing responses: {project}/responses/{endpoint}/{method}{path}
 * 
 * Supported Methods:
 * - GET: Read resource values
 * - PUT: Write resource values  
 * - POST: Execute resources
 * - DELETE: Delete object instances
 * - DISCOVER: Discover available resources
 * - OBSERVE: Start observing a resource
 * - CANCEL-OBSERVE: Stop observing a resource
 */

class MqttRequestHandler {
  constructor(client, config) { // mqtt client
    this.client = client;
    this.config = {
      enabled: config.enabled !== false,
      project: config.project || 'lwm2m',
      ...config
    };
  }

  /**
   * Handle incoming MQTT request and route to appropriate LwM2M function
   */
  async handleIncomingRequest(topic, messageBuffer) {
    try {
      const message = messageBuffer.toString();
      console.log(`[MQTT Request Handler] Received request on topic: ${topic}`);
      console.log(`[MQTT Request Handler] Message: ${message}`);

      // Parse topic: {project}/requests/{endpoint}/{method_and_path}
      const topicParts = topic.split('/');
      if (topicParts.length < 4 || topicParts[0] !== this.config.project || topicParts[1] !== 'requests') {
        console.warn(`[MQTT Request Handler] Invalid topic format: ${topic}`);
        return;
      }

      const endpoint = topicParts[2];
      const methodAndPath = topicParts.slice(3).join('/');

      // Parse method and path from the combined string
      const { method, path, payload, options } = this.parseRequest(methodAndPath, message);

      console.log(`[MQTT Request Handler] Parsed request - EP: ${endpoint}, Method: ${method}, Path: ${path}`);

      // Route to appropriate LwM2M function
      const response = await this.routeRequest(endpoint, method, path, payload, options);
      
      // Publish response back to MQTT
      await this.publishResponse(endpoint, method, path, response);

    } catch (error) {
      console.error('[MQTT Request Handler] Error handling request:', error);
      
      // Try to extract endpoint info for error response
      try {
        const topicParts = topic.split('/');
        if (topicParts.length >= 4) {
          const endpoint = topicParts[2];
          const methodAndPath = topicParts.slice(3).join('/');
          const { method, path } = this.parseRequest(methodAndPath, '{}');
          
          await this.publishResponse(endpoint, method, path, {
            error: error.message,
            timestamp: Date.now()
          });
        }
      } catch (responseError) {
        console.error('[MQTT Request Handler] Failed to send error response:', responseError);
      }
    }
  }

  /**
   * Parse the method and path from the topic and message payload
   */
  parseRequest(methodAndPath, messageStr) {
    let payload = null;
    let options = {};

    // Try to parse JSON message
    try {
      const messageObj = JSON.parse(messageStr);
      payload = messageObj.payload || null;
      options = messageObj.options || {};
    } catch (e) {
      // If not JSON, treat as plain text payload
      payload = messageStr || null;
    }

    // Extract method from the beginning of methodAndPath
    // Examples: "GET/3/0/0", "PUT/3/0/0", "POST/3/0/4"
    const parts = methodAndPath.split('/');
    const method = parts[0];
    const path = '/' + parts.slice(1).join('/');

    return { method, path, payload, options };
  }

  /**
   * Route the request to the appropriate LwM2M client function
   */
  async routeRequest(endpoint, method, path, payload, options) {
    // Extract format from options, default to 'text'
    const format = options.format || 'text';
    
    switch (method.toUpperCase()) {
      case 'GET':
        return await getRequest(endpoint, path, format);
        
      case 'PUT':
        if (payload === null || payload === undefined) {
          throw new Error('PUT request requires payload');
        }
        return await putRequest(endpoint, path, payload, format);
        
      case 'POST':
        return await postRequest(endpoint, path, payload, format);
        
      case 'DELETE':
        return await deleteRequest(endpoint, path);
        
      case 'DISCOVER':
        return await discoveryRequest(endpoint);
        
      case 'OBSERVE':
        return await startObserveRequest(endpoint, path, 0, format);
        
      case 'CANCEL-OBSERVE':
        return await stopObserveRequest(endpoint, path, 1, format);
        
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Publish response back to MQTT
   */
  async publishResponse(endpoint, method, path, response) {
    if (!this.client) {
      console.warn('[MQTT Request Handler] No MQTT client available for response');
      return;
    }

    const responseTopic = `${this.config.project}/responses/${endpoint}/${method}${path}`;
    const responsePayload = {
      timestamp: Date.now(),
      endpoint: endpoint,
      method: method,
      path: path,
      data: response
    };

    try {
      this.client.publish(responseTopic, JSON.stringify(responsePayload), { qos: 1 });
      console.log(`[MQTT Request Handler] Published response to ${responseTopic}`);
    } catch (error) {
      console.error('[MQTT Request Handler] Failed to publish response:', error);
    }
  }

}

module.exports = MqttRequestHandler;