// client/objects/location.js
var location = {
  id: 6,
  instances: [
    {
      resources: {
        0: {
          name: 'Latitude',
          value: '38.736946',
          type: 'string',
          units: '°',
          readable: true,
          writable: false,
          observable: true,
        },
        1: {
          name: 'Longitude',
          value: '-9.142685',
          type: 'string',
          units: '°',
          readable: true,
          writable: false,
          observable: true,
        },
        2: {
          name: 'Altitude',
          value: '50.0',
          type: 'float',
          units: 'm',
          readable: true,
          writable: false,
          observable: true,
        },
        7: {
          name: 'Timestamp',
          value: Math.floor(Date.now() / 1000),
          type: 'time',
          readable: true,
          writable: false,
          observable: true,
        },
      },
    },
  ],
};

setInterval(() => {
  location.instances[0].resources[7].value = Math.floor(Date.now() / 1000);
}, 1000);

module.exports = location;
