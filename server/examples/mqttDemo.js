#!/usr/bin/env node

/**
 * MQTT Request Handler Demo
 *
 * This script demonstrates how to use the MQTT Request Handler
 * to send requests to LwM2M devices via MQTT.
 *
 * Usage:
 *   node server/examples/mqttDemo.js
 *
 * Prerequisites:
 *   - MQTT broker running (default: localhost:1883)
 *   - LwM2M server with MQTT Request Handler running
 *   - At least one LwM2M device registered
 */

const mqtt = require('mqtt');

class MqttDemo {
  constructor(config = {}) {
    this.config = {
      project: config.project || 'lwm2m',
      host: config.host || 'localhost',
      port: config.port || 1883,
      clientId: config.clientId || 'lwm2m-demo-client',
    };

    this.client = null;
  }

  async connect() {
    console.log(
      `[Demo] Connecting to MQTT broker ${this.config.host}:${this.config.port}...`
    );

    this.client = mqtt.connect(
      `mqtt://${this.config.host}:${this.config.port}`,
      {
        clientId: this.config.clientId,
      }
    );

    return new Promise((resolve, reject) => {
      this.client.on('connect', () => {
        console.log('[Demo] Connected to MQTT broker');

        // Subscribe to responses and data
        const subscriptions = [
          `${this.config.project}/responses/+/+`,
          `${this.config.project}/+/sensor/+`,
          `${this.config.project}/+/registered`,
          `${this.config.project}/+/updated`,
          `${this.config.project}/+/deregistered`,
        ];

        subscriptions.forEach((topic) => {
          this.client.subscribe(topic, (err) => {
            if (err) {
              console.error(`[Demo] Failed to subscribe to ${topic}:`, err);
            } else {
              console.log(`[Demo] Subscribed to ${topic}`);
            }
          });
        });

        resolve();
      });

      this.client.on('error', reject);

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
    });
  }

  handleMessage(topic, messageBuffer) {
    const message = messageBuffer.toString();
    console.log(`\\n[Demo] Received message:`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Payload: ${message}`);

    try {
      const data = JSON.parse(message);
      if (data.timestamp) {
        const date = new Date(data.timestamp);
        console.log(`  Time: ${date.toISOString()}`);
      }
    } catch (e) {
      // Plain text message
    }
  }

  async sendRequest(endpoint, method, path, payload = null) {
    const topic = `${this.config.project}/requests/${endpoint}/${method}${path}`;

    let message;
    if (payload !== null) {
      message = JSON.stringify({ payload });
    } else {
      message = '{}';
    }

    console.log(`\\n[Demo] Sending request:`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Message: ${message}`);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[Demo] Request sent successfully`);
          resolve();
        }
      });
    });
  }

  async disconnect() {
    if (this.client) {
      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          console.log('[Demo] Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }
}

async function runDemo() {
  const demo = new MqttDemo();

  try {
    await demo.connect();

    // Wait a moment for subscriptions to be established
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('\\n=== MQTT LwM2M Demo Started ===');
    console.log('This demo will send various requests to LwM2M devices.');
    console.log('Make sure you have:');
    console.log('1. MQTT broker running on localhost:1883');
    console.log('2. LwM2M server with MQTT Request Handler running');
    console.log('3. At least one LwM2M device registered (e.g., "device001")');
    console.log('\\nSending demo requests...\\n');

    const deviceId = 'device001'; // Change this to match your device endpoint

    // Demo 1: Discover available resources
    console.log('=== Demo 1: Discover Resources ===');
    await demo.sendRequest(deviceId, 'DISCOVER', '');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 2: Read device manufacturer
    console.log('\\n=== Demo 2: Read Device Manufacturer ===');
    await demo.sendRequest(deviceId, 'GET', '/3/0/0');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 3: Read device model
    console.log('\\n=== Demo 3: Read Device Model ===');
    await demo.sendRequest(deviceId, 'GET', '/3/0/1');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 4: Read firmware version
    console.log('\\n=== Demo 4: Read Firmware Version ===');
    await demo.sendRequest(deviceId, 'GET', '/3/0/3');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 5: Start observing temperature (if temperature sensor available)
    console.log('\\n=== Demo 5: Start Observing Temperature ===');
    await demo.sendRequest(deviceId, 'OBSERVE', '/3303/0/5700');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 6: Write temperature threshold (if writable)
    console.log('\\n=== Demo 6: Write Temperature Threshold ===');
    await demo.sendRequest(deviceId, 'PUT', '/3303/0/5601', '-10.0');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo 7: Read back the threshold
    console.log('\\n=== Demo 7: Read Temperature Threshold ===');
    await demo.sendRequest(deviceId, 'GET', '/3303/0/5601');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\\n=== Demo Complete ===');
    console.log(
      'Keep this script running to see ongoing observation notifications.'
    );
    console.log('Press Ctrl+C to exit.\\n');

    // Keep the demo running to show observations
    process.on('SIGINT', async () => {
      console.log('\\n[Demo] Shutting down...');
      await demo.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Demo] Error:', error);
    await demo.disconnect();
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = MqttDemo;
