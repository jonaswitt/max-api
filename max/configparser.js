
function ConfigParser() {

}

WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']

ConfigParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var config = new Buffer(info_fields[1], 'base64');
  var pos = 0

  var response = {}

  var length = config[pos++]
  response['address'] = config.slice(pos, pos += 3).toString('hex')
  var device_type_id = config[pos++]
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
  response['device_type'] = device_type

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
  response['valve_setting'] = config[pos++] / 255 * 100

  response['wprogram'] = {}
  if (config.length > pos + 1) {
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

  return response;
};

module.exports = ConfigParser
