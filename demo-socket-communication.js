#!/usr/bin/env node

// Example demonstrating socket-based communication for devices without UDP ports
// This script shows how the LwM2M gateway can communicate with devices that 
// register without providing a port parameter

const { startLwM2MCoapServer, getRequest } = require('./server/resourceClient');
const { registerClient, getClient } = require('./server/clientRegistry');
const EventEmitter = require('events');

console.log('🚀 LwM2M Socket Communication Example');
console.log('=====================================');

// Create a mock socket to simulate a device connection
class MockSocket extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.requests = [];
  }

  write(data) {
    console.log('📤 Socket received request:', data.length, 'bytes');
    this.requests.push(data);
    
    // Simulate device response after a delay
    setTimeout(() => {
      const coapPacket = require('coap-packet');
      const responsePacket = coapPacket.generate({
        messageId: 12345,
        token: Buffer.from('test'),
        code: '2.05',
        payload: Buffer.from('{"temperature": 23.5, "humidity": 45}')
      });
      console.log('📥 Device responding with sensor data...');
      this.emit('data', responsePacket);
    }, 100);
  }
}

async function demonstrateSocketCommunication() {
  console.log('\n1️⃣  Simulating device registration without port...');
  
  // Create a mock socket representing the device connection
  const deviceSocket = new MockSocket();
  
  // Register a device WITHOUT a port (simulating a device behind NAT/firewall)
  const deviceEp = 'sensor-device-001';
  registerClient(deviceEp, {
    address: '192.168.1.100',
    port: null, // ⚠️  No port provided - device doesn't have open UDP port
    protocol: 'coap',
    location: '/rd/12345',
    lifetime: 86400,
    binding: 'U',
    socket: deviceSocket // ✅ Store the socket for future communication
  });

  console.log('✅ Device registered successfully');
  
  // Verify the client was registered
  const client = getClient(deviceEp);
  console.log('📋 Client info:', {
    ep: client.ep || deviceEp,
    address: client.address,
    port: client.port || 'null (no UDP port)',
    hasSocket: !!client.socket
  });

  console.log('\n2️⃣  Testing communication via stored socket...');
  
  try {
    // Import the socket communication function
    const { sendCoapRequestViaSocket } = require('./server/transport/coapClient');
    
    // Make a request using the stored socket
    const result = await sendCoapRequestViaSocket(
      deviceSocket,
      'GET',
      '/3303/0/5700', // LwM2M temperature sensor resource
      null,
      '',
      { timeout: 2000 }
    );

    console.log('✅ Successfully communicated via socket!');
    console.log('📊 Response:', {
      code: result.code,
      payload: result.payload,
      hasSocket: !!result.socket
    });

    console.log('\n3️⃣  Demonstrating integration with resource client...');
    
    // This would normally be done through the resourceClient.getRequest() function
    // which automatically chooses socket-based communication for devices without ports
    console.log('💡 The resourceClient.getRequest() function automatically detects');
    console.log('   when a client has no port but has a socket, and uses socket-based');
    console.log('   communication instead of trying to create a new UDP connection.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✨ Example complete!');
  console.log('\nKey benefits:');
  console.log('• Devices behind NAT/firewalls can be reached');
  console.log('• No need for port forwarding or open UDP ports on devices');
  console.log('• Backward compatible with existing devices that do provide ports');
  console.log('• Automatic fallback to regular UDP communication when ports are available');
}

// Run the demonstration
demonstrateSocketCommunication().catch(console.error);