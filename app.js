
var express = require('express');
var app = express();

var cubes = require('./routes/cubes');
app.use('/cubes', cubes);

app.listen(3000)
console.log("Listening in http://localhost:3000/...")
