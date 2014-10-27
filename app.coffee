
require('console-stamp')(console, "[dd.MM.yyyy HH:mm:ss]")
express = require 'express'
bodyParser = require 'body-parser'
app = express()
app.use bodyParser.urlencoded { extended: false }

cubes = require './routes/cubes'
app.use '/cubes', cubes

cube = require './lib/cube'
console.log "Looking for cubes..."

cube.browseCubes (error, cubes) ->
  if cubes
    console.log "Found " + cubes.length + " cube(s)"
    cube.setKnownCubes cubes

    app.listen 3000
    console.log "Listening on http://localhost:3000/..."  
  

