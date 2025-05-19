const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// GET /rooms - List all rooms
router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.render('rooms', {
      title: 'Rooms',
      rooms,
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
    });
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:id - Show room details
router.get('/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      req.flash('error', 'Room not found');
      return res.redirect('/rooms');
    }
    res.render('rooms/details', {
      title: room.name,
      room,
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;