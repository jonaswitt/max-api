
var express = require('express');
var net = require('net');
var dgram = require('dgram');
var split = require('split');
var through = require('through');
var es = require('event-stream');
var reduce = require('stream-reduce');
var maxparser = require('./max/parser');

var PORT = 62910;

var app = express();

app.get('/cubes', function(req, res) {
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

app.get('/cubes/:ip', function(req, res) {
  var parser = new maxparser();
  var client = net.createConnection(PORT, req.params.ip)
  client.on('error', function(error) {
    res.status(404).json({'error': "Could not connect to " + req.params.ip + ": " + error})
  })

  client
  // split into lines
  .pipe(split())
  // stop after L: line
  .pipe(through(function (line) {
    this.queue(line)
    if (line.split(':')[0] == 'L') {
      client.end()
      this.end()
    }
  }))
  // parse each line
  .pipe(es.map(function (data, cb) {
    cb(null, parser.parseLine(data))
  }))
  // combine all dictionaries
  .pipe(reduce(function(acc, data) {
    for (var attrname in data) { acc[attrname] = data[attrname]; }
    return acc;
  }, {}))
  // return combined dict as JSON
  .pipe(through(function (data) {
    res.json(data)
  }))
})
app.listen(3000)
console.log("Listening in http://localhost:3000/...")
