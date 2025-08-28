const { registerClient, updateClient, deregisterClientByLocation } = require('./clientRegistry');
const url = require('url');

function handleRegister(req, res, protocol, validRegistration) {
  return new Promise( async (resolve, reject) => {
    try {
      const query = new URLSearchParams(req.url.split('?')[1]);
      console.debug(query);
      const ep = query.get('ep');
      const lt = query.get('lt');
      const port = query.get('port');
      const binding = query.get('b') || 'U';

      if (!ep) {
        res.code = '4.00';
        res.end('Missing ep');
        return reject(new Error('Missing ep in registration'));
      }

      if (typeof validRegistration === 'function') {
        const authorized = await validRegistration(ep);
        if (!authorized) {
          res.code = '5.00';
          res.end('Registration error: not authorized');
          return reject(new Error('Registration not authorized'));
        }
      }

      const location = `/rd/${Math.floor(Math.random() * 65535)}`;
      
      // Set default lifetime to 1 day (86400 seconds) if not provided
      const lifetime = lt ? parseInt(lt) : 86400;

      registerClient(ep, {
        address: req.rsinfo.address,
        port: port || 5683,
        protocol,
        location,
        lifetime: lifetime,
        binding,
      });

      res.code = '2.01';
      const locationPath = location
        .split('/')
        .slice(1)
        .map((v) => Buffer.from(v));
      res.setOption('Location-Path', locationPath);
      res.end();

      resolve({ ep, location });
    } catch (err) {
      res.code = '5.00';
      res.end('Registration error');
      reject(err);
    }
  });
}

function handleUpdate(req, res, path) {
  return new Promise((resolve, reject) => {
    try {
      const location = `/rd/${path.split('/').pop()}`;

      const ep = updateClient(location, {
        address: req.rsinfo.address, 
        //port: req.rsinfo.port, // !! this port is the port used just for this message
        lastUpdate: Date.now(),
      });

      if (ep) {
        console.log(`[Server] Updated connection for client: ${ep}`);
        res.code = '2.04';
        res.end();
        resolve({ ep, location });
      } else {
        res.code = '4.04';
        res.end('Client not found');
        console.log(`[Server] Updated connection, client: ${ep} not found`);
        reject(new Error(`Client not found for location: ${location}`));
      }
    } catch (err) {
      res.code = '5.00';
      res.end('Update error');
      reject(err);
    }
  });
}

function handleDeregister(req, res, path) {
  return new Promise((resolve, reject) => {
    try {
      const location = `/rd/${path.split('/').pop()}`;
      const ep = deregisterClientByLocation(location);

      if (ep) {
        console.log(`[Server] Deregistered client: ${ep}`);
        res.code = '2.02';
        res.end();
        resolve({ ep, location });
      } else {
        res.code = '4.04';
        res.end('Client not found');
        reject(new Error(`Client not found for location: ${location}`));
      }
    } catch (err) {
      res.code = '5.00';
      res.end('Deregistration error');
      reject(err);
    }
  });
}

module.exports = {
  handleRegister,
  handleUpdate,
  handleDeregister,
};