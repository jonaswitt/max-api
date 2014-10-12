
var express = require('express');
var bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));

var cubes = require('./routes/cubes');
app.use('/cubes', cubes);

app.listen(3000)
console.log("Listening on http://localhost:3000/...")
