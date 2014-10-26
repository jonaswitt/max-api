
var maxparser = require('../max/parser');
var net = require('net');
var dgram = require('dgram');
var split = require('split');
var through = require('through');
var async = require('async')
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/max');
var models = require('./models')

var PORT = 62910;
var knownCubes = [];
var timers = [];

exports.getKnownCubes = function() {
  return knownCubes
}

exports.setKnownCubes = function(cubes) {
  timers.forEach(function(intervalId) { 
    clearInterval(intervalId)
  })
  timers = []
  
  knownCubes = cubes
  knownCubes.forEach(function(cube) {
    exports.recordData(cube['address'])
    timers.push(setInterval(exports.recordData, 60 * 1000, cube['address']))
  })
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
  
  parser.parseStream(client, function(error, data) {
    callback(data, error)
    client.end()
  }) 
}

exports.recordData = function(cube_ip) {
  exports.getCubeInfo(cube_ip, function(data, error) {
    async.waterfall([
        function(callback) {
          models.Cube.findOne({
            serial_number : data['cube']['serial_number']
          }, function(err, cube) {
            if (cube) {
              callback(null, cube)
            } else {
              var newCube = new models.Cube({
                ip : cube_ip,
                serial_number : data['cube']['serial_number']
              })
              newCube.save(function(err, cube) {
                callback(err, cube)
              })
            }
          })
        },
        function(cube, callback) {
          var date = new Date()

          async.each(Object.keys(data['rooms']), function(room_id, callback) {
            var room_name = data['rooms'][room_id]['name']
            var room_address = data['rooms'][room_id]['address']
            if (!room_address) {
              callback(null)
              return
            }

            async.waterfall([
                function(callback) {
                  models.Room.findOne({
                    address : room_address,
                    cubeId : cube._id
                  }, function(err, room) {
                    if (room) {
                      callback(null, room)
                    } else {
                      var newRoom = new models.Room({
                        name : room_name,
                        address : room_address,
                        cubeId : cube._id
                      })
                      newRoom.save(function(err, room) {
                        callback(err, room)
                      })
                    }
                  })
                },
                function(room, callback) {
                  async.each(data['rooms'][room_id]['devices'], function(
                      device, callback) {

                    async.waterfall([ function(callback) {
                      models.Device.findOne({
                        address : device['address'],
                        roomId : room._id
                      }, function(err, deviceObj) {
                        if (deviceObj) {
                          callback(null, deviceObj)
                        } else {
                          var newDevice = new models.Device({
                            name : device['name'],
                            address : device['address'],
                            type : device['type'],
                            roomId : room._id
                          })
                          newDevice.save(function(err, deviceObj) {
                            callback(err, deviceObj)
                          })
                        }
                      })
                    }, function(deviceObj, callback) {
                      var recordObj = new models.Record({
                        deviceId : deviceObj._id,
                        date : date,
                        actual_temp : device['actual_temp'],
                        target_temp : device['target_temp'],
                        valve_pos : device['valve_pos'],
                        mode : device['mode']
                      })
                      recordObj.save(function(err, recordObj) {
                        callback(err)
                      })
                    } ], function(err) {
                      callback(err)
                    })
                  }, function(err) {
                    callback(err)
                  })
                } ], function(err) {
              callback(err)
            })

          }, function(err) {
            callback(err)
          })

        } ], function(err, result) {
      if (err)
        console.log(err)
      else {
        console.log('Recorded data for cube ' + cube_ip)
      }
    })

  })
}

