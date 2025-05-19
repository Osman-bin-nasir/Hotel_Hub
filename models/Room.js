// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name:        { type: String, required: true },      // Room name or title
  number:      { type: Number, required: true },      // Unique room number
  category:    { type: String, required: true },      // e.g., Deluxe, Suite
  description: { type: String },
  price:       { type: Number, required: true },
  capacity:    { type: Number },
  amenities:   [String],                              // e.g., ["WiFi", "TV"]
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Room', roomSchema);
