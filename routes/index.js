const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

// GET / - Homepage with available rooms
router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({ isAvailable: true });
    res.render('user/home', { 
      title: 'Available Rooms',
      rooms 
    });
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:id - Room details
router.get('/rooms/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).render('error', { 
        title: 'Room Not Found',
        error: { message: 'The requested room does not exist' }
      });
    }
    
    res.render('user/room-details', {
      title: room.name,
      room
    });
  } catch (err) {
    next(err);
  }
});

// GET /profile - User profile
router.get('/profile', ensureAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-password -__v') // Exclude sensitive fields
      .lean();

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }

    res.render('user/profile', {
      title: 'Your Profile',
      user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;