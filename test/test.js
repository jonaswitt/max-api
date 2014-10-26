
var assert = require("assert")
var fs = require("fs")
var maxparser = require("../max/parser")
var path = require("path")

var assert_response = function(name, done) {
  var fileStream = fs.createReadStream(path.join(__dirname, 'fixtures/' + name + '.txt'))
  var expected_result = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/' + name + '_parsed.json')))
  var parser = new maxparser()
  parser.parseStream(fileStream, function(error, data) {
    assert.deepEqual(expected_result, data)
    done(error)
  })
}

describe('Parser', function(){
  describe('#parseLine()', function(){
    it('should parse cube hello response', function(done) {
      assert_response('cube_hello_1', done)
    })
  })
})
