const express = require('express');
const { ensureAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const router = express.Router();

// GET User's Bookings (Booking List)
router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.session.userId })
      .populate('room')
      .populate('user'); // Keep if needed

    res.render('user/booking-list', {
      title: 'Booking List',
      bookings,
      success: req.flash('success'),
      session: req.session
    });
  } catch (err) {
    next(err);
  }
});

// GET Booking Form
router.get('/new/:roomId', ensureAuth, async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      req.flash('error', 'Room not found');
      return res.redirect('/rooms');
    }

    const user = await User.findById(req.session.userId).lean();

    res.render('user/booking-form', {
      title: `Book ${room.name}`,
      room,
      user,
      errors: [],
      formData: {},
      session: req.session
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
    }),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const { roomId, checkIn, checkOut, name, email, phone } = req.body;

    if (!errors.isEmpty()) {
      const room = await Room.findById(roomId);
      const user = await User.findById(req.session.userId).lean();
      return res.render('user/booking-form', {
        title: `Book ${room.name}`,
        room,
        user,
        errors: errors.array(),
        formData: req.body || {},
        session: req.session
      });
    }

    // Check for overlapping bookings
    const existingBooking = await Booking.findOne({
      room: roomId,
      $or: [
        { checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } }
      ]
    });

    if (existingBooking) {
      const room = await Room.findById(roomId);
      const user = await User.findById(req.session.userId).lean();
      return res.render('user/booking-form', {
        title: `Book ${room.name}`,
        room,
        user,
        errors: [{ msg: 'Room not available for selected dates' }],
        formData: req.body || {},
        session: req.session
      });
    }

    // Create booking
    const booking = await Booking.create({
      user: req.session.userId,
      room: roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      name,
      email,
      phone
    });

    // Mark room as unavailable
    const room = await Room.findById(roomId);
    room.isAvailable = false;
    await room.save();

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
      .populate('room')
      .populate('user');

    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/bookings');
    }

    res.render('user/booking-confirm', {
      title: 'Booking Confirmed',
      booking,
      success: req.flash('success'),
      session: req.session
    });
  } catch (err) {
    next(err);
  }
});

// DELETE Booking
router.delete('/:id', ensureAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      req.flash('error', 'Booking not found');
      return res.redirect('/bookings');
    }

    if (booking.user.toString() !== req.session.userId) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/bookings');
    }

    const room = await Room.findById(booking.room);
    if (room) {
      room.isAvailable = true;
      await room.save();
    }

    await Booking.deleteOne({ _id: req.params.id });

    req.flash('success', 'Booking canceled successfully');
    res.redirect('/bookings');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
