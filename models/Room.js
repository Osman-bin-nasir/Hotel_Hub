// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number:      { type: Number, required: true },
  category:    { type: String, required: true },
  price:       { type: Number, required: true },
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Room', roomSchema);
