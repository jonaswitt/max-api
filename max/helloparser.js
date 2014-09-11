
function HelloParser() {

}

HelloParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var serial_number = info_fields[0];
  var rf_address = info_fields[1];
  var firmware_version = parseInt(info_fields[2], 16);

  return {"serial_number": serial_number, "rf_address": rf_address, "firmware": firmware_version};
};

module.exports = HelloParser
