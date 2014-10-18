
var cube = require('./lib/cube')
var fs = require('fs')
var path = require('path')
var dateformat = require('dateformat')

var CUBE_IP = '192.168.1.150'

var recordings_path = path.join(process.cwd(), 'recorded_data')
fs.mkdir(recordings_path, function() { })

var writeData = function() {
  cube.getCubeInfo(CUBE_IP, function(data, error) {
    var date = new Date()
    for (var room_id in data['rooms']) {
      var room_name = data['rooms'][room_id]['name']
      data['rooms'][room_id]['devices'].forEach(function(device) {
        var record = [dateformat(date, 'dd.mm.yyyy HH:MM:ss')]
        if (device['type'] == 'thermostat') {
          record.push(device['valve_pos'])
          record.push(device['target_temp'])
          record.push(device['actual_temp'])
          record.push(device['mode'])
        }
        else if (device['type'] == 'wall_thermostat') {
          record.push(device['actual_temp'])
          record.push(device['mode'])
        }
        else {
          return
        }

        var recording_path = path.join(recordings_path, room_name + ' - ' + device['name'] + ' (' + device['address'] + ').csv')
        fs.appendFile(recording_path, record.join(';') + "\n")
      })
    }

  })
}

writeData()
setInterval(function() {
  writeData()
}, 60 * 1000)
