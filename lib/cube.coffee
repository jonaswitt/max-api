maxparser = require("./parser")
net = require("net")
dgram = require("dgram")
split = require("split")
through = require("through")
async = require("async")
mongoose = require("mongoose")
mongoose.connect "mongodb://localhost/max"
models = require("./models")

PORT = 62910
knownCubes = []
timers = []

exports.getKnownCubes = ->
  knownCubes

exports.setKnownCubes = (cubes) ->
  timers.forEach (intervalId) ->
    clearInterval intervalId

  timers = []
  knownCubes = cubes
  knownCubes.forEach (cube) ->
    exports.recordData cube["address"]
    timers.push setInterval(exports.recordData, 60 * 1000, cube["address"])

exports.browseCubes = (callback) ->
  cubes = []
  client = dgram.createSocket("udp4")
  client.on "message", (msg, rinfo) ->
    signature = msg.slice(0, 8).toString("ascii")
    return  unless signature is "eQ3MaxAp"
    firmware = msg.slice(24, 26).toString("hex")
    port = (if firmware > "010e" then 62910 else 80)
    cubes.push
      address: rinfo.address
      port: port
      firmware: firmware

  client.on "error", (err) ->
    console.log err.stack

  client.bind 23272, ->
    client.setBroadcast true
    client.setTTL 5
    client.addMembership "224.0.0.1"

    # hello message: 'eQ3Max***********I'
    message = new Buffer("6551334d61782a002a2a2a2a2a2a2a2a2a2a49", "hex")
    client.send message, 0, message.length, 23272, "224.0.0.1", (err, bytes) ->
      console.log err  if err

    client.send message, 0, message.length, 23272, "255.255.255.255", (err, bytes) ->
      console.log err  if err

  setTimeout (->
    client.close()
    callback null, cubes
  ), 2000

exports.getCubeInfo = (ip, callback) ->
  parser = new maxparser()
  client = net.createConnection(PORT, ip)
  client.on "error", (error) ->
    callback `undefined`, error

  parser.parseStream client, (error, data) ->
    callback data, error
    client.end()

exports.recordData = (cube_ip) ->
  exports.getCubeInfo cube_ip, (data, error) ->
    async.waterfall [
      (callback) ->
        models.Cube.findOne
          serial_number: data["cube"]["serial_number"]
        , (err, cube) ->
          if cube
            callback null, cube
          else
            newCube = new models.Cube(
              ip: cube_ip
              serial_number: data["cube"]["serial_number"]
            )
            newCube.save (err, cube) ->
              callback err, cube

      (cube, callback) ->
        date = new Date()
        async.each Object.keys(data["rooms"]), ((room_id, callback) ->
          room_name = data["rooms"][room_id]["name"]
          room_address = data["rooms"][room_id]["address"]
          unless room_address
            callback null
            return
          async.waterfall [
            (callback) ->
              models.Room.findOne
                address: room_address
                cubeId: cube._id
              , (err, room) ->
                if room
                  callback null, room
                else
                  newRoom = new models.Room(
                    name: room_name
                    address: room_address
                    cubeId: cube._id
                  )
                  newRoom.save (err, room) ->
                    callback err, room

            (room, callback) ->
              async.each data["rooms"][room_id]["devices"], ((device, callback) ->
                async.waterfall [
                  (callback) ->
                    models.Device.findOne
                      address: device["address"]
                      roomId: room._id
                    , (err, deviceObj) ->
                      if deviceObj
                        callback null, deviceObj
                      else
                        newDevice = new models.Device(
                          name: device["name"]
                          address: device["address"]
                          type: device["type"]
                          roomId: room._id
                        )
                        newDevice.save (err, deviceObj) ->
                          callback err, deviceObj

                  (deviceObj, callback) ->
                    recordObj = new models.Record(
                      deviceId: deviceObj._id
                      date: date
                      actual_temp: device["actual_temp"]
                      target_temp: device["target_temp"]
                      valve_pos: device["valve_pos"]
                      mode: device["mode"]
                    )
                    recordObj.save (err, recordObj) ->
                      callback err

                ], (err) ->
                  callback err

              ), (err) ->
                callback err

          ], (err) ->
            callback err

        ), (err) ->
          callback err

    ], (err, result) ->
      if err
        console.log err
      else
        console.log "Recorded data for cube " + cube_ip
