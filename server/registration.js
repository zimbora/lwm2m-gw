const { registerClient, updateClient, deregisterClientByLocation } = require('./clientRegistry');
const url = require('url');

function handleRegister(req, res) {
  return new Promise((resolve, reject) => {
    try {
      const query = new URLSearchParams(req.url.split('?')[1]);
      const ep = query.get('ep');
      const lt = query.get('lt');
      const binding = query.get('b') || 'U';

      if (!ep) {
        res.code = '4.00';
        res.end('Missing ep');
        return reject(new Error('Missing ep in registration'));
      }

      const location = `/rd/${Math.floor(Math.random() * 65535)}`;

      registerClient(ep, {
        address: req.rsinfo.address,
        port: 56830,
        location,
        lifetime: parseInt(lt),
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
  console.log("handling update");
  const location = `/rd/${path.split('/').pop()}`;
  console.log("location:",location);
  const ep = updateClient(location, {
      address: req.rsinfo.address,
      port: req.rsinfo.port,
      lastUpdate: Date.now(),
    });

  if (ep) {  
    console.log(`[Server] Updated client: ${ep}`);
    res.code = '2.04';
    res.end();
  } else {
    res.code = '4.04';
    res.end('Client not found');
  }
}

function handleDeregister(req, res, path) {
  console.log("handling deregister");
  const location = `/rd/${path.split('/').pop()}`;
  const ep = deregisterClientByLocation(location);
  console.log("path:",path)
  console.log("location:",location)
  console.log(ep);

  if (ep) {
    console.log(`[Server] Deregistered client: ${ep}`);
    res.code = '2.02';
    res.end();
  } else {
    res.code = '4.04';
    res.end('Client not found');
  }
}

module.exports = {
  handleRegister,
  handleUpdate,
  handleDeregister,
};
