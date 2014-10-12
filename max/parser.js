
WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
DEVICE_TYPES = ['cube', 'thermostat', undefined, 'wall_thermostat', 'window_sensor', 'eco_switch']
MODES = ['auto', 'manual', 'vacation', 'boost']

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
    var device_type = DEVICE_TYPES[device_type_id]

    var device_address = metadata.slice(pos, pos += 3).toString('hex')
    var device_serial = metadata.slice(pos, pos += 10).toString()
    var device_name_length = metadata[pos++]
    var device_name = metadata.slice(pos, pos += device_name_length).toString()
    var device_room_id = metadata[pos++]

    if (!this.data['rooms'][device_room_id]) this.data['rooms'][device_room_id] = {'devices':[]}
    this.data['rooms'][device_room_id]['devices'].push({'type': device_type, 'address': device_address, 'serial': device_serial, 'name': device_name, 'room_id': device_room_id})
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
  var device_type = DEVICE_TYPES[device_type_id]

  var unknown1 = config.slice(pos, pos += 3).toString('hex')
  response['serial'] = config.slice(pos, pos += 10).toString()

  var current_value = config[pos++] / 2
  if (device_type == 'thermostat' || device_type == 'wall_thermostat') response['comfort_temp'] = current_value

  var current_value = config[pos++] / 2
  if (device_type == 'thermostat' || device_type == 'wall_thermostat') response['eco_temp'] = current_value

  var current_value = config[pos++] / 2
  if (device_type == 'thermostat' || device_type == 'wall_thermostat') response['max_set_temp'] = current_value

  var current_value = config[pos++] / 2
  if (device_type == 'thermostat' || device_type == 'wall_thermostat') response['min_set_temp'] = current_value

  var current_value = config[pos++] / 2 - 3.5
  if (device_type == 'thermostat') response['temp_offset'] = current_value

  var current_value = config[pos++] / 2
  if (device_type == 'thermostat') response['window_open_temp'] = current_value

  var current_value = config[pos++]
  if (device_type == 'thermostat') response['window_open_duration'] = current_value

  var boost = config[pos++]
  if (device_type == 'thermostat') {
    response['boost_valve_pos'] = (boost & 0x1f) * 5
    var boost_duration_value = (boost & 0xe0) >> 5
    response['boost_duration'] = boost_duration_value == 7 ? 30 : boost_duration_value * 5
  }

  var decalc = config[pos++]
  if (device_type == 'thermostat') {
    response['decalc_hour'] = (boost & 0x1f)
    response['decalc_day'] = (boost & 0xe0) >> 5
  }

  var current_value = config[pos++] / 255 * 100
  if (device_type == 'thermostat') response['max_valve_setting'] = current_value

  var current_value = config[pos++] / 255 * 100
  if (device_type == 'thermostat') response['valve_offset'] = current_value

  if (config.length > pos + 1 && device_type == 'thermostat') {
    response['wprogram'] = {}
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
    var device = this.getDeviceByAddress(address)

    var unknown1 = info[pos++]
    var state1 = info[pos++]
    response['initialized'] = (state1 & 0x2) >> 1 == 1
    response['is_answer'] = (state1 & 0x4) >> 2 == 1
    response['has_error'] = (state1 & 0x8) >> 3 == 1
    response['is_valid'] = (state1 & 0x10) >> 4 == 1

    var state2 = info[pos++]
    if (device['type'] == 'thermostat' || device['type'] == 'wall_thermostat') response['mode'] = MODES[state2 & 0x3]

    response['dst_auto'] = (state2 & 0x8) >> 3 == 1
    response['gateway_known'] = (state2 & 0x10) >> 4 == 1
    response['panel_locked'] = (state2 & 0x20) >> 5 == 1
    response['link_error'] = (state2 & 0x40) >> 6 == 1
    response['battery_low'] = (state2 & 0x80) >> 7 == 1

    var current_value = info[pos++]
    if (device['type'] == 'thermostat') response['valve_pos'] = current_value

    var target_temp = info[pos++] / 2
    if (device['type'] == 'thermostat') response['target_temp'] = target_temp

    if (device['type'] == 'wall_thermostat') {
      pos += 3

      var actual = info[pos++]
      if (target_temp > 64) actual += 255

      response['actual_temp'] = actual / 10
    }
    else if (device['type'] == 'thermostat') {
      var shift = info[pos++]

      var actual = info[pos++]

      if (shift == 1) actual += 255

      actual = actual / 10
      if (actual == 0) actual = null

      response['actual_temp'] = actual
    }

    pos = next_pos

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
