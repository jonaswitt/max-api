
assert = require "assert"
fs = require "fs"
maxparser = require "../lib/parser"
path = require "path"

assert_response = (name, done) ->
  fileStream = fs.createReadStream path.join __dirname, 'fixtures/' + name + '.txt'
  expected_result = JSON.parse fs.readFileSync path.join __dirname, 'fixtures/' + name + '_parsed.json'
  parser = new maxparser()
  parser.parseStream fileStream, (error, data) ->
    assert.deepEqual expected_result, data
    done error

describe 'Parser', () ->
  describe '#parseLine()', () ->
    it 'should parse cube hello response', (done) ->
      assert_response 'cube_hello_1', done
