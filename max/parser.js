
var helloparser = require('./helloparser')
var metadataparser = require('./metadataparser')
var configparser = require('./configparser')
var devicelistparser = require('./devicelistparser')

function Parser() {

}

Parser.prototype.parseLine = function(line) {
  console.log(line)
  var items = line.split(':')
  if (items[0] == 'H') {
      var parser = new helloparser()
      return {'H': parser.parseLine(line)}
  }
  else if (items[0] == 'M') {
      var parser = new metadataparser()
      return {'M': parser.parseLine(line)}
  }
  else if (items[0] == 'C') {
      var parser = new configparser()
      var data = parser.parseLine(line)
      var response = {}
      response["C_" + data['address']] = data
      return response
  }
  else if (items[0] == 'L') {
      var parser = new devicelistparser()
      return {'L': parser.parseLine(line)}
  }
  else {
    // console.log(line);
    return {}
  }
};

module.exports = Parser
