
function DeviceListParser() {

}

DeviceListParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info = new Buffer(items[1], 'base64');
  var pos = 0
  var response = {}

  var length = info[pos++]
  response['address'] = info.slice(pos, pos += 3).toString('hex')

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

  console.log("date: " + info.slice(pos, pos+3).toString('hex'))
  var date1 = info[pos++]
  var date2 = info[pos++]

  var date = (date1 << 8) + date2
  console.log("byte1: " + date1 + " byte2: " + date2 + " date: " + date)

  var month = ((date & 0xE000) >> 12) + ((date & 0x80) >> 7)
  var day = (date & 0x1F00) >> 8
  var year = (date & 0x3F) + 2000
  var time_until_minutes = info[pos++] * 30

  response['until'] = new Date(year, month, day, time_until_minutes / 60, time_until_minutes % 60, 0)

  return response;
};

module.exports = DeviceListParser
