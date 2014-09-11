
function HelloParser() {

}

HelloParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  var serial_number = info_fields[0];
  var rf_address = info_fields[1];
  var firmware_version = parseInt(info_fields[2], 16);

  console.log("Serial Number: " + serial_number + " RF Address: " + rf_address + " Firmware: " + firmware_version);
};

module.exports = HelloParser
