
function MetadataParser() {

}

MetadataParser.prototype.parseLine = function(line) {
  var items = line.split(':')
  var info_fields = items[1].split(',')

  return new Buffer(info_fields[2], 'base64').toString('ascii');
};

module.exports = MetadataParser
