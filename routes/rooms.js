// routes/rooms.js
const express = require('express');
const router  = express.Router();
const Room    = require('../models/Room');

// GET /rooms  → list all rooms
router.get('/', async (req, res) => {
  const rooms = await Room.find();
  res.render('rooms', { title: 'Rooms', rooms });
});

// POST /rooms → create a new room
router.post('/', async (req, res) => {
  const { number, category, price } = req.body;
  const room = new Room({ number, category, price });
  await room.save();
  res.status(201).json(room);
});

module.exports = router;
