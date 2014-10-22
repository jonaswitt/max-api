var cube = require('./lib/cube')
var fs = require('fs')
var path = require('path')
var dateformat = require('dateformat')
var async = require('async')

var CUBE_IP = '192.168.1.150'

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/max');

var Cube = mongoose.model('Cube', {
  ip : String,
  serial_number : String
});

var Room = mongoose.model('Room', {
  cubeId : mongoose.Schema.ObjectId,
  name : String,
  address : String
});

var Device = mongoose.model('Device', {
  roomId : mongoose.Schema.ObjectId,
  name : String,
  address : String,
  type : String
});

var Record = mongoose.model('Record', {
  deviceId : mongoose.Schema.ObjectId,
  date : Date,
  actual_temp : Number,
  target_temp : Number,
  valve_pos : Number,
  mode : String
});

var recordings_path = path.join(process.cwd(), 'recorded_data')
fs.mkdir(recordings_path, function() {
})

var writeData = function() {
  cube.getCubeInfo(CUBE_IP, function(data, error) {
    async.waterfall([
        function(callback) {
          Cube.findOne({
            serial_number : data['cube']['serial_number']
          }, function(err, cube) {
            if (cube) {
              callback(null, cube)
            } else {
              var newCube = new Cube({
                ip : CUBE_IP,
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
                  Room.findOne({
                    address : room_address,
                    cubeId : cube._id
                  }, function(err, room) {
                    if (room) {
                      callback(null, room)
                    } else {
                      var newRoom = new Room({
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
                      Device.findOne({
                        address : device['address'],
                        roomId : room._id
                      }, function(err, deviceObj) {
                        if (deviceObj) {
                          callback(null, deviceObj)
                        } else {
                          var newDevice = new Device({
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
                      var recordObj = new Record({
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
    })

  })
}

writeData()
setInterval(function() {
  writeData()
}, 60 * 1000)
