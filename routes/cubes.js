var express = require('express');
var net = require('net');
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
  cube.browseCubes(function(error, cubes) {
    if (cubes)
      res.json(cubes)
    else
      res.status(500).json({'error': error})
  })
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
