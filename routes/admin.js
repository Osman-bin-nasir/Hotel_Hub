const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const router = express.Router();

// ========================
//  ADMIN DASHBOARD
// ========================
router.get('/', ensureAdmin, async (req, res, next) => {
  try {
    const [roomCount, bookingCount, recentBookings] = await Promise.all([
      Room.countDocuments(),
      Booking.countDocuments(),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user room')
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      roomCount,
      bookingCount,
      recentBookings
    });
  } catch (err) {
    next(err);
  }
});

// ========================
//  ROOMS CRUD OPERATIONS
// ========================
router.get('/rooms', ensureAdmin, async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.render('admin/rooms/list', {
      title: 'Manage Rooms',
      rooms
    });
  } catch (err) {
    next(err);
  }
});

router.get('/rooms/new', ensureAdmin, (req, res) => {
  res.render('admin/rooms/form', {
    title: 'Create New Room',
    room: null,
    errors: []
  });
});

router.post('/rooms', ensureAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 1 }).withMessage('Valid price required'),
  body('capacity').isInt({ min: 1 }).withMessage('Valid capacity required'),
  body('amenities').optional().isArray()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const roomData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      capacity: req.body.capacity,
      amenities: Array.isArray(req.body.amenities) ? req.body.amenities : []
    };

    if (!errors.isEmpty()) {
      return res.render('admin/rooms/form', {
        title: 'Create New Room',
        room: roomData,
        errors: errors.array()
      });
    }

    const existingRoom = await Room.findOne({ name: roomData.name });
    if (existingRoom) {
      return res.render('admin/rooms/form', {
        title: 'Create New Room',
        room: roomData,
        errors: [{ msg: 'Room with this name already exists' }]
      });
    }

    await Room.create(roomData);
    req.flash('success', 'Room created successfully');
    res.redirect('/admin/rooms');
  } catch (err) {
    next(err);
  }
});

router.get('/rooms/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      req.flash('error', 'Room not found');
      return res.redirect('/admin/rooms');
    }

    res.render('admin/rooms/form', {
      title: 'Edit Room',
      room,
      errors: []
    });
  } catch (err) {
    next(err);
  }
});

router.post('/rooms/:id', ensureAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 1 }).withMessage('Valid price required'),
  body('capacity').isInt({ min: 1 }).withMessage('Valid capacity required'),
  body('amenities').optional().isArray()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const roomData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      capacity: req.body.capacity,
      amenities: Array.isArray(req.body.amenities) ? req.body.amenities : []
    };

    if (!errors.isEmpty()) {
      return res.render('admin/rooms/form', {
        title: 'Edit Room',
        room: { ...roomData, _id: req.params.id },
        errors: errors.array()
      });
    }

    const existingRoom = await Room.findOne({
      name: roomData.name,
      _id: { $ne: req.params.id }
    });

    if (existingRoom) {
      return res.render('admin/rooms/form', {
        title: 'Edit Room',
        room: { ...roomData, _id: req.params.id },
        errors: [{ msg: 'Room with this name already exists' }]
      });
    }

    await Room.findByIdAndUpdate(req.params.id, roomData);
    req.flash('success', 'Room updated successfully');
    res.redirect('/admin/rooms');
  } catch (err) {
    next(err);
  }
});

router.post('/rooms/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    req.flash('success', 'Room deleted successfully');
    res.redirect('/admin/rooms');
  } catch (err) {
    next(err);
  }
});

// ========================
//  BOOKINGS MANAGEMENT
// ========================
router.get('/bookings', ensureAdmin, async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .sort({ checkIn: -1 })
      .populate('user room');

    res.render('admin/bookings/list', {
      title: 'Manage Bookings',
      bookings
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bookings/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    req.flash('success', 'Booking canceled successfully');
    res.redirect('/admin/bookings');
  } catch (err) {
    next(err);
  }
});

module.exports = router;