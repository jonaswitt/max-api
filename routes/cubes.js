var express = require('express');
var net = require('net');
var dgram = require('dgram');
var cube = require('../lib/cube');

var router = express.Router();

// Discover cubes
//
// Cubes on the local network can be discovered by sending a UDP broadcast
// with a specific "hello" message (see below). Cubes will respond with
// an 'eQ3MaxAp' signature and their firmware version.
//
// By default, this code will wait exactly 2 seconds to collect responses. It
// will not return a response earlier than that.
router.get('/', function(req, res) {
  var cubes = [];
  var client = dgram.createSocket('udp4');

  client.on('message', function(msg, rinfo) {
    var signature = msg.slice(0, 8).toString('ascii')
    if (signature != 'eQ3MaxAp') return;

    var firmware = msg.slice(24, 26).toString('hex')
    var port = firmware > '010e' ? 62910 : 80;

    cubes.push({'address': rinfo.address, 'port': port, 'firmware': firmware})
  });

  client.on("error", function (err) {
    console.log(err.stack);
  });

  client.bind(23272, function () {
    client.setBroadcast(true)
    client.setTTL(5)

    client.addMembership('224.0.0.1')

    // hello message: 'eQ3Max***********I'
    var message = new Buffer("6551334d61782a002a2a2a2a2a2a2a2a2a2a49", "hex");

    client.send(message, 0, message.length, 23272, '224.0.0.1', function(err, bytes) {
      if (err) console.log(err);
    });
    client.send(message, 0, message.length, 23272, '255.255.255.255', function(err, bytes) {
      if (err) console.log(err);
    });
  })

  setTimeout(function() {
    client.close();
    res.json(cubes)
  }, 2000);
})

// Get cube state
//
// When connecting to the cube via TCP port 62910 (at least from FW 010e on),
// the cube returns its state information in a proprietary, text-based
// protocol.
//
// See also http://www.domoticaforum.eu/viewtopic.php?f=66&t=6654#p50589
router.get('/:ip', function(req, res) {
  cube.getCubeInfo(req.params.ip, function(data, error) {
    if (error) {
      res.status(404).json({'error': "Could not connect to " + req.params.ip + ": " + error})
    }
    else {
      res.json(data)
    }
  })
})

module.exports = router;
