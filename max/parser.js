
var helloparser = require('./helloparser')
var metadataparser = require('./metadataparser')
var configparser = require('./configparser')
var devicelistparser = require('./devicelistparser')

function Parser() {
  this.rooms = {}
  this.finishedParsing = false

  this.raw_out = {}
}

Parser.prototype.parseLine = function(line) {
  // console.log(line)
  var items = line.split(':')
  if (items[0] == 'H') {
      var parser = new helloparser()
      this.raw_out['H'] = parser.parseLine(line)
  }
  else if (items[0] == 'M') {
      var parser = new metadataparser()
      this.raw_out['M'] = parser.parseLine(line)
  }
  else if (items[0] == 'C') {
      var parser = new configparser()
      var data = parser.parseLine(line)
      this.raw_out["C_" + data['address']] = data
  }
  else if (items[0] == 'L') {
      this.finishedParsing = true
      var parser = new devicelistparser()
      this.raw_out['L'] = parser.parseLine(line)
  }
};

module.exports = Parser
