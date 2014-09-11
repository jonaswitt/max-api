
var express = require('express');
var net = require('net');
var split = require('split');
var through = require('through');
var maxparser = require('./max/parser');

var HOST = '192.168.1.150';
var PORT = 62910;

var parser = new maxparser();
var client = net.createConnection(PORT, HOST)

client.pipe(split()).pipe(through(function (line) {
  var items = line.split(':')
  this.queue(line + "\n")
  parser.parseLine(line);
  // if (items[0] == 'H') {
  //   console.log("Hello packet received: " + items[1])
  // }
  if (items[0] == 'L') {
    client.end()
    this.end()
  }
}));


// var app = express();
//
//
//
// app.get('/', function(req, res) {
//   var parser = new maxparser();
//   var client = net.createConnection(PORT, HOST)
//
//   client.pipe(split()).pipe(through(function (line) {
//     var items = line.split(':')
//     this.queue(line + "\n")
//     parser.parseLine(line);
//     // if (items[0] == 'H') {
//     //   console.log("Hello packet received: " + items[1])
//     // }
//     if (items[0] == 'L') {
//       client.end()
//       this.end()
//     }
//   })).pipe(res);
//
//   // res.send('Hello World');
// })
// app.listen(3000)
// console.log("Listening in http://localhost:3000/...")
