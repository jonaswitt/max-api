
WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']

function Parser() {
  this.data = {'cube': {}, 'rooms':{}}
  this.finishedParsing = false
}

Parser.prototype.parseLine = function(line) {
  // console.log(line)
  var items = line.split(':')
  if (items[0] == 'H') {
    this.parseHello(line)
  }
  else if (items[0] == 'M') {
    this.parseMetadata(line)
  }
  else if (items[0] == 'C') {
    this.parseConfig(line)
  }
  else if (items[0] == 'L') {
    this.parseDeviceList(line)
    this.finishedParsing = true
  }
};

Parser.prototype.parseHello = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var serial_number = info_fields[0];
  var rf_address = info_fields[1];
  var firmware_version = parseInt(info_fields[2], 16);

  this.data['cube'] = {"serial_number": serial_number, "address": rf_address, "firmware": firmware_version};
}

Parser.prototype.parseMetadata = function(line) {
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
    this.data['rooms'][room_id] = {'name': room_name, 'address': room_address, 'devices':[]}
  }

  var devices = []
  var device_count = metadata[pos++]
  for (var i = 0; i < device_count; i++) {
    var device_type_id = metadata[pos++]
    switch (device_type_id) {
    case 0:
      var device_type = 'cube'
      break;
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
      var device_type = device_type_id
    }
    var device_address = metadata.slice(pos, pos += 3).toString('hex')
    var device_serial = metadata.slice(pos, pos += 10).toString()
    var device_name_length = metadata[pos++]
    var device_name = metadata.slice(pos, pos += device_name_length).toString()
    var device_room_id = metadata[pos++]

    if (!this.data['rooms'][device_room_id]) this.data['rooms'][device_room_id] = {'devices':[]}
    this.data['rooms'][device_room_id]['devices'].push({'type': device_type, 'address': device_address, 'serial': device_serial, 'name': device_name})
  }

}

Parser.prototype.parseConfig = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var config = new Buffer(info_fields[1], 'base64');
  var pos = 0

  var response = {}

  var length = config[pos++]
  var address = config.slice(pos, pos += 3).toString('hex')

  var device_type_id = config[pos++]

  var unknown1 = config.slice(pos, pos += 3).toString('hex')
  response['serial'] = config.slice(pos, pos += 10).toString()
  response['comfort_temp'] = config[pos++] / 2
  response['eco_temp'] = config[pos++] / 2
  response['max_set_temp'] = config[pos++] / 2
  response['min_set_temp'] = config[pos++] / 2
  response['temp_offset'] = config[pos++] / 2 - 3,5
  response['window_open_temp'] = config[pos++] / 2
  response['window_open_duration'] = config[pos++]

  var boost = config[pos++]
  response['boost_valve_pos'] = (boost & 0x1f) * 5
  var boost_duration_value = (boost & 0xe0) >> 5
  response['boost_duration'] = boost_duration_value == 7 ? 30 : boost_duration_value * 5

  var decalc = config[pos++]
  response['decalc_hour'] = (boost & 0x1f)
  response['decalc_day'] = (boost & 0xe0) >> 5

  response['max_valve_setting'] = config[pos++] / 255 * 100
  response['valve_offset'] = config[pos++] / 255 * 100

  response['wprogram'] = {}
  if (config.length > pos + 1 && device_type_id == 1) {
    for (var i = 0; i < 7; i++) {
      var wprogram = config.slice(pos, pos += 26)
      response['wprogram'][WEEKDAYS[i]] = []
      for (var j = 0; j < 13; j++) {
        var program_entry = wprogram.slice(j * 2, (j + 1) * 2)
        var int_value = (program_entry[0] << 8) + program_entry[1]
        if (int_value == 0 || program_entry.length == 0) break;

        var temp = ((int_value & 0x7E00) >> 8) / 4
        var minutes = (int_value & 0x1ff) * 5
        if (minutes > 1440) break;

        response['wprogram'][WEEKDAYS[i]].push({'temp': temp, 'min': minutes})

        if (minutes == 1440) break;
      }
    }
  }

  var device = this.getDeviceByAddress(address)
  if (device) {
    for (var attrname in response) { device[attrname] = response[attrname]; }
  }
  // else {
  //   console.log("Could not find device with address " + address)
  // }
}

Parser.prototype.parseDeviceList = function(line) {
  var items = line.split(':')
  var info = new Buffer(items[1], 'base64');

  var pos = 0
  while (info.length > pos + 1) {
    var response = {}

    var length = info[pos++]
    var next_pos = pos + length
    var address = info.slice(pos, pos += 3).toString('hex')

    var unknown1 = info[pos++]
    var state1 = info[pos++]
    response['initialized'] = (state1 & 0x2) >> 1 == 1
    response['is_answer'] = (state1 & 0x4) >> 2 == 1
    response['has_error'] = (state1 & 0x8) >> 3 == 1
    response['is_valid'] = (state1 & 0x10) >> 4 == 1

    var state2 = info[pos++]
    switch (state2 & 0x3) {
    case 0x0:
      response['mode'] = 'auto'
      break;
    case 0x1:
      response['mode'] = 'manual'
      break;
    case 0x2:
      response['mode'] = 'vacation'
      break;
    case 0x3:
      response['mode'] = 'boost'
      break;
    }
    response['dst_auto'] = (state2 & 0x8) >> 3 == 1
    response['gateway_known'] = (state2 & 0x10) >> 4 == 1
    response['panel_locked'] = (state2 & 0x20) >> 5 == 1
    response['link_error'] = (state2 & 0x40) >> 6 == 1
    response['battery_low'] = (state2 & 0x80) >> 7 == 1

    response['valve_pos'] = info[pos++]
    response['temp_point'] = info[pos++] / 2

    if (length > 6) {
      var date1 = info[pos++]
      var date2 = info[pos++]

      var date = (date1 << 8) + date2

      var month = ((date & 0xE000) >> 12) + ((date & 0x80) >> 7)
      var day = (date & 0x1F00) >> 8
      var year = (date & 0x3F) + 2000
      var time_until_minutes = info[pos++] * 30

      response['until'] = new Date(year, month, day, time_until_minutes / 60, time_until_minutes % 60, 0)
    }

    pos = next_pos

    var device = this.getDeviceByAddress(address)
    if (device) {
      for (var attrname in response) { device[attrname] = response[attrname]; }
    }
    // else {
    //   console.log("Could not find device with address " + address)
    //   console.dir(response)
    // }
  }
}

Parser.prototype.getDeviceByAddress = function(address) {
  for (room_id in this.data['rooms']) {
    for (i in this.data['rooms'][room_id]['devices']) {
      var _device = this.data['rooms'][room_id]['devices'][i]
      if (_device['address'] == address) {
        return _device
      }
    }
  }
  return null;
}

module.exports = Parser
