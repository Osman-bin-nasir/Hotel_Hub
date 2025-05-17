const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

// GET / - Homepage with available rooms
router.get('/', async (req, res, next) => {
  try {
    console.log('Handling GET / route, session:', req.session); // Debug log
    // Redirect to login if not authenticated
    if (!req.session.userId) {
      console.log('User not authenticated, redirecting to /auth/login');
      return res.redirect('/auth/login');
    }

    const rooms = await Room.find({ isAvailable: true });
    res.render('user/home', { 
      title: 'Available Rooms',
      rooms,
      session: req.session // Pass session to view for nav.ejs
    });
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:id - Room details
router.get('/rooms/:id', async (req, res, next) => {
  try {
    console.log('Handling GET /rooms/:id route, id:', req.params.id); // Debug log
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).render('error', { 
        title: 'Room Not Found',
        error: { message: 'The requested room does not exist' },
        session: req.session
      });
    }
    
    res.render('user/room-details', {
      title: room.name,
      room,
      session: req.session // Pass session to view
    });
  } catch (err) {
    next(err);
  }
});

// GET /profile - User profile
router.get('/profile', ensureAuth, async (req, res, next) => {
  try {
    console.log('Handling GET /profile route, userId:', req.session.userId); // Debug log
    const user = await User.findById(req.session.userId)
      .select('-password -__v') // Exclude sensitive fields
      .lean();

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }

    res.render('user/profile', {
      title: 'Your Profile',
      user,
      session: req.session // Pass session to view
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;