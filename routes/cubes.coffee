express = require("express")
net = require("net")
cube = require("../lib/cube")
router = express.Router()

# Discover cubes
#
# Cubes on the local network can be discovered by sending a UDP broadcast
# with a specific "hello" message (see below). Cubes will respond with
# an 'eQ3MaxAp' signature and their firmware version.
#
# By default, this code will wait exactly 2 seconds to collect responses. It
# will not return a response earlier than that.
router.get "/", (req, res) ->
  res.json cube.getKnownCubes()

# Get cube state
#
# When connecting to the cube via TCP port 62910 (at least from FW 010e on),
# the cube returns its state information in a proprietary, text-based
# protocol.
#
# See also http://www.domoticaforum.eu/viewtopic.php?f=66&t=6654#p50589
router.get "/:ip", (req, res) ->
  cube.getCubeInfo req.params.ip, (data, error) ->
    if error
      res.status(404).json error: "Could not connect to " + req.params.ip + ": " + error
    else
      res.json data

module.exports = router
