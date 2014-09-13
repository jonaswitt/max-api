
function MetadataParser() {

}

MetadataParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var metadata = new Buffer(info_fields[2], 'base64');
  var pos = 2;

  var rooms = []
  var room_count = metadata[pos++]
  for (var i = 0; i < room_count; i++) {
    var room_id = metadata[pos++]
    var room_name_length = metadata[pos++]
    var room_name = metadata.slice(pos, pos += room_name_length).toString()
    var room_address = metadata.slice(pos, pos += 3).toString('hex')
    rooms.push({'id': room_id, 'name': room_name, 'address': room_address})
  }

  var devices = []
  var device_count = metadata[pos++]
  for (var i = 0; i < device_count; i++) {
    var device_type_id = metadata[pos++]
    switch (device_type_id) {
    case 1:
      var device_type = 'thermostat'
      break;
    case 3:
      var device_type = 'wall_thermostat'
      break;
    case 4:
      var device_type = 'window_sensor'
      break;
    case 5:
      var device_type = 'eco_switch'
      break;
    default:
      var device_type = 'unknown'
    }
    var device_address = metadata.slice(pos, pos += 3).toString('hex')
    var device_serial = metadata.slice(pos, pos += 10).toString()
    var device_name_length = metadata[pos++]
    var device_name = metadata.slice(pos, pos += device_name_length).toString()
    var device_room_id = metadata[pos++]

    devices.push({'type': device_type, 'address': device_address, 'serial': device_serial, 'name': device_name, 'room_id': device_room_id})
  }

  return {'rooms': rooms, 'devices': devices};
};

module.exports = MetadataParser
