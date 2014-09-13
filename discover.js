
var dgram = require('dgram');

var client = dgram.createSocket('udp4');

client.on('message', function(msg, rinfo) {
  var signature = msg.slice(0, 8).toString('ascii')
  if (signature != 'eQ3MaxAp') return;

  var firmware = msg.slice(24, 26).toString('hex')
  var port = firmware > '010e' ? 62910 : 80;

  console.log("Cube found: " + rinfo.address + " Firmware: " + firmware)
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
}, 2500);
