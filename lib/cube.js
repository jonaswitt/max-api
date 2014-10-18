
var maxparser = require('../max/parser');
var net = require('net');
var split = require('split');
var through = require('through');

var PORT = 62910;

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
