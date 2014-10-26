
var mongoose = require('mongoose');

exports.Cube = mongoose.model('Cube', {
  ip : String,
  serial_number : String
});

exports.Room = mongoose.model('Room', {
  cubeId : mongoose.Schema.ObjectId,
  name : String,
  address : String
});

exports.Device = mongoose.model('Device', {
  roomId : mongoose.Schema.ObjectId,
  name : String,
  address : String,
  type : String
});

exports.Record = mongoose.model('Record', {
  deviceId : mongoose.Schema.ObjectId,
  date : Date,
  actual_temp : Number,
  target_temp : Number,
  valve_pos : Number,
  mode : String
});
