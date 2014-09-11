
var helloparser = require('./helloparser')
var metadataparser = require('./metadataparser')

function Parser() {

}

Parser.prototype.parseLine = function(line) {
  var items = line.split(':')
  if (items[0] == 'H') {
      var parser = new helloparser()
      parser.parseLine(line)
  }
  else if (items[0] == 'M') {
      var parser = new metadataparser()
      parser.parseLine(line)
  }
  else {
    // console.log(line);
  }
};

module.exports = Parser
