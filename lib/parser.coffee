Parser = ->
  @data =
    cube: {}
    rooms: {}
  @finishedParsing = false

split = require("split")
through = require("through")

WEEKDAYS = [
  "sat"
  "sun"
  "mon"
  "tue"
  "wed"
  "thu"
  "fri"
]
DEVICE_TYPES = [
  "cube"
  "thermostat"
  null
  "wall_thermostat"
  "window_sensor"
  "eco_switch"
]
MODES = [
  "auto"
  "manual"
  "vacation"
  "boost"
]

Parser::parseStream = (stream, callback) ->
  responded = false
  parser = this

  # split into lines
  # parse until done, then return JSON
  stream.pipe(split()).pipe through((line) ->
    parser.parseLine line
    if parser.finishedParsing and not responded
      callback null, parser.data
      responded = true
  )

Parser::parseLine = (line) ->
  # console.log(line)
  items = line.split(":")
  if items[0] is "H"
    @parseHello line
  else if items[0] is "M"
    @parseMetadata line
  else if items[0] is "C"
    @parseConfig line
  else if items[0] is "L"
    @parseDeviceList line
    @finishedParsing = true

Parser::parseHello = (line) ->
  items = line.split(":")
  info_fields = items[1].split(",")
  serial_number = info_fields[0]
  rf_address = info_fields[1]
  firmware_version = parseInt(info_fields[2], 16)
  @data["cube"] =
    serial_number: serial_number
    address: rf_address
    firmware: firmware_version

Parser::parseMetadata = (line) ->
  items = line.split(":")
  info_fields = items[1].split(",")
  metadata = new Buffer(info_fields[2], "base64")
  pos = 2
  rooms = []
  room_count = metadata[pos++]
  i = 0

  while i < room_count
    room_id = metadata[pos++]
    room_name_length = metadata[pos++]
    room_name = metadata.slice(pos, pos += room_name_length).toString()
    room_address = metadata.slice(pos, pos += 3).toString("hex")
    @data["rooms"][room_id] =
      name: room_name
      address: room_address
      devices: []
    i++
  devices = []
  device_count = metadata[pos++]
  i = 0

  while i < device_count
    device_type_id = metadata[pos++]
    device_type = DEVICE_TYPES[device_type_id]
    device_address = metadata.slice(pos, pos += 3).toString("hex")
    device_serial = metadata.slice(pos, pos += 10).toString()
    device_name_length = metadata[pos++]
    device_name = metadata.slice(pos, pos += device_name_length).toString()
    device_room_id = metadata[pos++]
    @data["rooms"][device_room_id] = devices: []  unless @data["rooms"][device_room_id]
    @data["rooms"][device_room_id]["devices"].push
      type: device_type
      address: device_address
      serial: device_serial
      name: device_name
      room_id: device_room_id
    i++

Parser::parseConfig = (line) ->
  items = line.split(":")
  info_fields = items[1].split(",")
  config = new Buffer(info_fields[1], "base64")
  pos = 0
  response = {}
  length = config[pos++]
  address = config.slice(pos, pos += 3).toString("hex")
  device_type_id = config[pos++]
  device_type = DEVICE_TYPES[device_type_id]
  unknown1 = config.slice(pos, pos += 3).toString("hex")
  response["serial"] = config.slice(pos, pos += 10).toString()
  current_value = config[pos++] / 2
  response["comfort_temp"] = current_value  if device_type is "thermostat" or device_type is "wall_thermostat"
  current_value = config[pos++] / 2
  response["eco_temp"] = current_value  if device_type is "thermostat" or device_type is "wall_thermostat"
  current_value = config[pos++] / 2
  response["max_set_temp"] = current_value  if device_type is "thermostat" or device_type is "wall_thermostat"
  current_value = config[pos++] / 2
  response["min_set_temp"] = current_value  if device_type is "thermostat" or device_type is "wall_thermostat"
  current_value = config[pos++] / 2 - 3.5
  response["temp_offset"] = current_value  if device_type is "thermostat"
  current_value = config[pos++] / 2
  response["window_open_temp"] = current_value  if device_type is "thermostat"
  current_value = config[pos++]
  response["window_open_duration"] = current_value  if device_type is "thermostat"
  boost = config[pos++]
  if device_type is "thermostat"
    response["boost_valve_pos"] = (boost & 0x1f) * 5
    boost_duration_value = (boost & 0xe0) >> 5
    response["boost_duration"] = (if boost_duration_value is 7 then 30 else boost_duration_value * 5)
  decalc = config[pos++]
  if device_type is "thermostat"
    response["decalc_hour"] = (boost & 0x1f)
    response["decalc_day"] = (boost & 0xe0) >> 5
  current_value = config[pos++] / 255 * 100
  response["max_valve_setting"] = current_value  if device_type is "thermostat"
  current_value = config[pos++] / 255 * 100
  response["valve_offset"] = current_value  if device_type is "thermostat"
  if config.length > pos + 1 and device_type is "thermostat"
    response["wprogram"] = {}
    i = 0
    while i < 7
      wprogram = config.slice(pos, pos += 26)
      response["wprogram"][WEEKDAYS[i]] = []
      j = 0

      while j < 13
        program_entry = wprogram.slice(j * 2, (j + 1) * 2)
        int_value = (program_entry[0] << 8) + program_entry[1]
        break  if int_value is 0 or program_entry.length is 0
        temp = ((int_value & 0x7E00) >> 8) / 4
        minutes = (int_value & 0x1ff) * 5
        break  if minutes > 1440
        response["wprogram"][WEEKDAYS[i]].push
          temp: temp
          min: minutes

        break  if minutes is 1440
        j++
      i++
  device = @getDeviceByAddress(address)
  if device
    for attrname of response
      device[attrname] = response[attrname]

Parser::parseDeviceList = (line) ->
  items = line.split(":")
  info = new Buffer(items[1], "base64")
  pos = 0
  while info.length > pos + 1
    response = {}
    length = info[pos++]
    next_pos = pos + length
    address = info.slice(pos, pos += 3).toString("hex")
    device = @getDeviceByAddress(address)
    unknown1 = info[pos++]
    state1 = info[pos++]
    response["initialized"] = (state1 & 0x2) >> 1 is 1
    response["is_answer"] = (state1 & 0x4) >> 2 is 1
    response["has_error"] = (state1 & 0x8) >> 3 is 1
    response["is_valid"] = (state1 & 0x10) >> 4 is 1
    state2 = info[pos++]
    response["mode"] = MODES[state2 & 0x3]  if device["type"] is "thermostat" or device["type"] is "wall_thermostat"
    response["dst_auto"] = (state2 & 0x8) >> 3 is 1
    response["gateway_known"] = (state2 & 0x10) >> 4 is 1
    response["panel_locked"] = (state2 & 0x20) >> 5 is 1
    response["link_error"] = (state2 & 0x40) >> 6 is 1
    response["battery_low"] = (state2 & 0x80) >> 7 is 1
    current_value = info[pos++]
    response["valve_pos"] = current_value  if device["type"] is "thermostat"
    target_temp = info[pos++] / 2
    response["target_temp"] = target_temp  if device["type"] is "thermostat"
    if device["type"] is "wall_thermostat"
      pos += 3
      actual = info[pos++]
      actual += 255  if target_temp > 64
      response["actual_temp"] = actual / 10
    else if device["type"] is "thermostat"
      shift = info[pos++]
      actual = info[pos++]
      actual += 255  if shift is 1
      actual = actual / 10
      actual = null  if actual is 0
      response["actual_temp"] = actual
    pos = next_pos
    if device
      for attrname of response
        device[attrname] = response[attrname]

Parser::getDeviceByAddress = (address) ->
  for room_id of @data["rooms"]
    for i of @data["rooms"][room_id]["devices"]
      _device = @data["rooms"][room_id]["devices"][i]
      return _device  if _device["address"] is address
  null

module.exports = Parser
