// server/examples/mqttTopicExamples.js

/**
 * MQTT Topic Structure Examples for LwM2M Communication
 * 
 * This file demonstrates different approaches to MQTT topic design
 * and provides concrete examples for various use cases.
 */

console.log(`
==========================================================
MQTT Topic Structure Examples for LwM2M Communication
==========================================================

This document outlines different approaches to structuring MQTT topics
for LwM2M device communication, with examples and recommendations.

==========================================================
RECOMMENDED TOPIC STRUCTURE (Implemented)
==========================================================

1. INBOUND REQUESTS (MQTT → LwM2M Device):
   {project}/requests/{endpoint}/{method}{path}
   
   Examples:
   - lwm2m/requests/device001/GET/3/0/0
   - lwm2m/requests/sensor123/PUT/3303/0/5601
   - lwm2m/requests/actuator456/POST/3/0/4
   - lwm2m/requests/device001/OBSERVE/3303/0/5700

2. OUTBOUND RESPONSES (LwM2M Device → MQTT):
   {project}/responses/{endpoint}/{method}{path}
   
   Examples:
   - lwm2m/responses/device001/GET/3/0/0
   - lwm2m/responses/sensor123/PUT/3303/0/5601
   - lwm2m/responses/device001/OBSERVE/3303/0/5700

3. DEVICE DATA (Existing - Observations/Notifications):
   {project}/{endpoint}/sensor{path}
   
   Examples:
   - lwm2m/device001/sensor/3303/0/5700
   - lwm2m/sensor123/sensor/6/0/7
   - lwm2m/actuator456/sensor/3311/0/5850

4. DEVICE LIFECYCLE EVENTS:
   {project}/{endpoint}/{event}
   
   Examples:
   - lwm2m/device001/registered
   - lwm2m/device001/updated
   - lwm2m/device001/deregistered

==========================================================
ALTERNATIVE TOPIC STRUCTURES (For Reference)
==========================================================

ALTERNATIVE 1: Hierarchical by Object Type
└── {project}/
    ├── devices/{endpoint}/
    │   ├── requests/{method}/{object}/{instance}/{resource}
    │   ├── responses/{method}/{object}/{instance}/{resource}
    │   ├── data/{object}/{instance}/{resource}
    │   └── events/{event_type}
    
Examples:
- lwm2m/devices/device001/requests/GET/3/0/0
- lwm2m/devices/device001/responses/GET/3/0/0
- lwm2m/devices/device001/data/3303/0/5700
- lwm2m/devices/device001/events/registered

ALTERNATIVE 2: By LwM2M Object Classes
└── {project}/
    ├── device/{endpoint}/requests/{method}{path}
    ├── device/{endpoint}/responses/{method}{path}
    ├── server/{endpoint}/requests/{method}{path}
    ├── server/{endpoint}/responses/{method}{path}
    ├── security/{endpoint}/{action}
    └── data/{endpoint}/{object_id}/{instance}/{resource}

Examples:
- lwm2m/device/device001/requests/GET/3/0/0
- lwm2m/server/device001/requests/PUT/1/0/1
- lwm2m/security/device001/provision
- lwm2m/data/device001/3303/0/5700

ALTERNATIVE 3: RESTful Style
└── {project}/
    ├── {endpoint}/objects/{object_id}/instances/{instance_id}/resources/{resource_id}
    │   ├── GET
    │   ├── PUT
    │   └── POST
    ├── {endpoint}/discover
    ├── {endpoint}/observe/{object_id}/{instance_id}/{resource_id}
    └── {endpoint}/events/{event_type}

Examples:
- lwm2m/device001/objects/3/instances/0/resources/0/GET
- lwm2m/device001/objects/3303/instances/0/resources/5700/PUT
- lwm2m/device001/discover
- lwm2m/device001/observe/3303/0/5700

==========================================================
TOPIC STRUCTURE COMPARISON
==========================================================

Criteria                | Recommended | Alt 1      | Alt 2      | Alt 3
------------------------|-------------|------------|------------|----------
Simplicity              | ★★★★☆       | ★★★☆☆      | ★★☆☆☆      | ★★☆☆☆
MQTT Wildcards Support  | ★★★★★       | ★★★★★      | ★★★★☆      | ★★★☆☆
Backward Compatibility  | ★★★★★       | ★★★☆☆      | ★★☆☆☆      | ★☆☆☆☆
Scalability             | ★★★★☆       | ★★★★★      | ★★★★☆      | ★★★☆☆
Implementation Ease     | ★★★★★       | ★★★☆☆      | ★★☆☆☆      | ★★☆☆☆

==========================================================
WILDCARD SUBSCRIPTION EXAMPLES
==========================================================

Using the recommended structure, you can subscribe to:

1. All requests to any device:
   lwm2m/requests/+/+

2. All requests to specific device:
   lwm2m/requests/device001/+

3. All GET requests to any device:
   lwm2m/requests/+/GET/+

4. All responses from any device:
   lwm2m/responses/+/+

5. All sensor data from any device:
   lwm2m/+/sensor/+

6. Temperature data from all devices:
   lwm2m/+/sensor/3303/0/5700

7. All events for any device:
   lwm2m/+/registered
   lwm2m/+/updated
   lwm2m/+/deregistered

==========================================================
MESSAGE PAYLOAD EXAMPLES
==========================================================

REQUEST PAYLOADS:

1. Simple GET request:
   Topic: lwm2m/requests/device001/GET/3/0/0
   Payload: {}

2. PUT request with value:
   Topic: lwm2m/requests/device001/PUT/3303/0/5601
   Payload: {"payload": "-30.0"}

3. POST execution:
   Topic: lwm2m/requests/device001/POST/3/0/4
   Payload: {}

4. PUT with options:
   Topic: lwm2m/requests/device001/PUT/3303/0/5700
   Payload: {
     "payload": "25.6",
     "options": {
       "format": "text/plain"
     }
   }

RESPONSE PAYLOADS:

1. Successful GET response:
   Topic: lwm2m/responses/device001/GET/3/0/0
   Payload: {
     "timestamp": 1699123456789,
     "endpoint": "device001",
     "method": "GET",
     "path": "/3/0/0",
     "data": "NodeCoAP Inc."
   }

2. Error response:
   Topic: lwm2m/responses/device001/GET/3/0/0
   Payload: {
     "timestamp": 1699123456789,
     "endpoint": "device001",
     "method": "GET", 
     "path": "/3/0/0",
     "data": {
       "error": "Resource not found"
     }
   }

==========================================================
IMPLEMENTATION NOTES
==========================================================

1. The recommended structure balances simplicity with functionality
2. It maintains backward compatibility with existing gateway code
3. MQTT wildcards work well for monitoring and debugging
4. Topics are human-readable and self-documenting
5. The structure scales well with multiple devices and projects

==========================================================
`);

// Example function to generate topic names
function generateTopics(project, endpoint, method, path) {
  return {
    request: `${project}/requests/${endpoint}/${method}${path}`,
    response: `${project}/responses/${endpoint}/${method}${path}`,
    data: `${project}/${endpoint}/sensor${path}`,
    
    // Wildcard subscriptions
    wildcards: {
      allRequests: `${project}/requests/+/+`,
      deviceRequests: `${project}/requests/${endpoint}/+`,
      methodRequests: `${project}/requests/+/${method}/+`,
      allResponses: `${project}/responses/+/+`,
      deviceResponses: `${project}/responses/${endpoint}/+`,
      allData: `${project}/+/sensor/+`,
      deviceData: `${project}/${endpoint}/sensor/+`
    }
  };
}

// Example usage
const exampleTopics = generateTopics('lwm2m', 'device001', 'GET', '/3/0/0');
console.log('Example topic generation:');
console.log(JSON.stringify(exampleTopics, null, 2));

module.exports = {
  generateTopics
};