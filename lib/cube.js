
var maxparser = require('../max/parser');
var net = require('net');
var dgram = require('dgram');
var split = require('split');
var through = require('through');

var PORT = 62910;
var knownCubes = [];

exports.getKnownCubes = function() {
  return knownCubes
}

exports.setKnownCubes = function(cubes) {
  knownCubes = cubes
}

exports.browseCubes = function(callback) {
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
    callback(null, cubes)
  }, 2000);
}

exports.getCubeInfo = function(ip, callback) {
  var parser = new maxparser();
  var client = net.createConnection(PORT, ip)
  client.on('error', function(error) {
    callback(undefined, error)
  })
  var responded = false

  client
  // split into lines
  .pipe(split())
  // parse until done, then return JSON
  .pipe(through(function (line) {
    parser.parseLine(line)
    if (parser.finishedParsing && !responded) {
      callback(parser.data, undefined)
      client.end()
      responded = true
    }
  }))
}
