// server/server.js
const { 
  startLwM2MCoapServer,
  startLwM2MMqttServer,
  discoveryRequest,
  getRequest,
  startObserveRequest,
  stopObserveRequest,
  putRequest,
  postRequest,
  deleteRequest,
  createRequest,
} = require('./resourceClient');

const sharedEmitter = require('./transport/sharedEmitter');
const {listClients} = require('./clientRegistry');


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

async function getInfo(clientEp) {
  // Delay to wait for client registration

  setTimeout(() => {
    const client = clientEp;
    //console.log(`sending requests to client: ${client}`)

    try{
      // Read
      discoveryRequest(clientEp)

      getRequest(clientEp,'/3/0/0')

      getRequest(clientEp,'/3303/0/5601')

      // Observe timestamp
      //startObserveRequest(clientEp,'/6/0/7');

      // Observe Temperature
      startObserveRequest(clientEp,'/3303/0/5700');

      // Write
      setTimeout(() => putRequest(clientEp,'/3303/0/5601', "-30.0"), 2000);

      setTimeout(() => getRequest(clientEp,'/3303/0/5601'), 3000);
    }catch(error){
      console.error(error);
    }
    // Execute
    //setTimeout(() => sendCoapRequest(client, 'POST', '/3/0/2'), 9000);
  }, 2000);

  /*
    This doesn't work, client is set to undefined!!
    Investigate it..
  setTimeout(() => {
    const client = clientEp;
    try{
      getRequest(clientEp,'/3303/0/5601');
    }catch(error){
      console.error(error);
    }
  }, 10000);
  */
}

// Listen for registration events
sharedEmitter.on('registration', ({ protocol, ep, location }) => {
  console.log(`[Event] Client registered via ${protocol}: ${ep} at ${location}`);
  getInfo(ep);
});

// Listen for update events
sharedEmitter.on('update', ({ protocol, ep, location }) => {
  console.log(`[Event] Client updated via ${protocol}: ${ep} at ${location}`);
});

// Listen for deregistration events
sharedEmitter.on('deregistration', ({ protocol, ep }) => {
  console.log(`[Event] Client deregistered via ${protocol}: ${ep}`);
});

sharedEmitter.on('observation', ({ protocol, ep, token, method, path, payload }) => {
  
  console.log(`[Server] Data received via: ${ep}/${method}${path}`);
  console.log(`[Server] payload: ${payload}`);
  
});

sharedEmitter.on('response', ({ protocol, ep, method, path, payload, options }) => {
  if(path != "/.well-known/core"){
    console.log(`[Event] Client response ${protocol}: ${ep}/${method}${path}`);
    if(payload != null)
      console.log(`[Event] Client payload ${payload}`);
  }else{
    //console.log(payload)
  }

});

sharedEmitter.on('error', (error) => {
  console.log(error);
});

// Define a validation function
function validateRegistration(ep, options) {
  console.log(`[Validation] Validating registration for endpoint: ${ep}`);
  
  // Example validation logic
  if (!ep || ep.length < 3) {
    console.error(`[Validation Failed] Endpoint "${ep}" is invalid`);
    return false;
  }

  // Add more custom validation logic as needed
  return true;
}

startLwM2MCoapServer(validation = validateRegistration);

startLwM2MMqttServer('mqtt://broker.hivemq.com', {
  port: 1883,
  username: 'myuser',
  password: 'mypassword',
  clientId: 'myLwM2MMqttServer',
}).then((mqttClient) => {
  console.log('MQTT LwM2M server is running.');
}).catch((err) => {
  console.error('Failed to start MQTT LwM2M server:', err.message);
});


setInterval(()=>{
  console.log('[Server] Registered clients:', listClients());
},60000)


