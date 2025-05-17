const express = require('express');
const { ensureAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const router = express.Router();

// GET Booking Form
router.get('/new/:roomId', ensureAuth, async (req, res, next) => {
  console.log('🔍 [GET /bookings/new] incoming cookies:', req.cookies);
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      req.flash('error', 'Room not found');
      return res.redirect('/rooms');
    }

    res.render('user/booking-form', {
      title: `Book ${room.name}`,
      room,
      errors: [],
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    next(err);
  }
});

// POST Create Booking
router.post('/', ensureAuth, [
  body('roomId').isMongoId().withMessage('Invalid room selection'),
  body('checkIn').isISO8601().withMessage('Invalid check-in date'),
  body('checkOut').isISO8601().withMessage('Invalid check-out date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkIn)) {
        throw new Error('Check-out must be after check-in');
      }
      return true;
    })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const { roomId, checkIn, checkOut } = req.body;
    
    if (!errors.isEmpty()) {
      const room = await Room.findById(roomId);
      return res.render('user/booking-form', {
        title: `Book ${room.name}`,
        room,
        errors: errors.array(),
        csrfToken: req.csrfToken()
      });
    }

    // Availability Check
    const existingBooking = await Booking.findOne({
        room: roomId,
        $or: [
          { checkIn: { $lt: new Date(checkOut) } },  // Added closing }
          { checkOut: { $gt: new Date(checkIn) } }   // Fixed object structure
        ]
      });

    if (existingBooking) {
      const room = await Room.findById(roomId);
      return res.render('user/booking-form', {
        title: `Book ${room.name}`,
        room,
        errors: [{ msg: 'Room not available for selected dates' }],
        csrfToken: req.csrfToken()
      });
    }

    // Create Booking
    const booking = await Booking.create({
      user: req.session.userId,
      room: roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut)
    });

    req.flash('success', 'Booking confirmed!');
    res.redirect(`/bookings/confirm/${booking._id}`);
  } catch (err) {
    next(err);
  }
});

// GET Booking Confirmation
router.get('/confirm/:id', ensureAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room user');

    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/bookings');
    }

    res.render('user/booking-confirm', {
      title: 'Booking Confirmed',
      booking,
      success: req.flash('success')
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;