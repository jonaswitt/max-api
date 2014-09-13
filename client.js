
var express = require('express');
var net = require('net');
var split = require('split');
var through = require('through');
var es = require('event-stream');
var reduce = require('stream-reduce');
var maxparser = require('./max/parser');

var HOST = '192.168.1.150';
var PORT = 62910;

var app = express();

app.get('/', function(req, res) {
  var parser = new maxparser();
  var client = net.createConnection(PORT, HOST)

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
