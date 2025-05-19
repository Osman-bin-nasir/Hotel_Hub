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
      recentBookings,
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
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
      rooms,
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/rooms/new', ensureAdmin, (req, res) => {
  res.render('admin/rooms/form', {
    title: 'Create New Room',
    room: null,
    errors: req.flash('errors') || [],
    session: req.session,
    currentPath: req.path,
    messages: { success: req.flash('success'), error: req.flash('error') }
  });
});

router.post(
  '/rooms',
  ensureAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['Standard', 'Deluxe', 'Suite'])
      .withMessage('Invalid category'),
    body('number').trim().notEmpty().withMessage('Room number is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 1 }).withMessage('Valid price required'),
    body('capacity').isInt({ min: 1 }).withMessage('Valid capacity required'),
    body('amenities').optional().isArray().withMessage('Amenities must be an array')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      const roomData = {
        name: req.body.name,
        category: req.body.category,
        number: req.body.number,
        description: req.body.description,
        price: parseFloat(req.body.price),
        capacity: parseInt(req.body.capacity),
        amenities: Array.isArray(req.body.amenities) ? req.body.amenities : []
      };

      if (!errors.isEmpty()) {
        req.flash('errors', errors.array());
        return res.render('admin/rooms/form', {
          title: 'Create New Room',
          room: roomData,
          errors: errors.array(),
          session: req.session,
          currentPath: req.path,
          messages: { success: req.flash('success'), error: req.flash('error') }
        });
      }

      const existingRoom = await Room.findOne({
        $or: [{ name: roomData.name }, { number: roomData.number }]
      });
      if (existingRoom) {
        req.flash('errors', [
          { msg: 'Room with this name or number already exists' }
        ]);
        return res.render('admin/rooms/form', {
          title: 'Create New Room',
          room: roomData,
          errors: [{ msg: 'Room with this name or number already exists' }],
          session: req.session,
          currentPath: req.path,
          messages: { success: req.flash('success'), error: req.flash('error') }
        });
      }

      await Room.create(roomData);
      req.flash('success', 'Room created successfully');
      res.redirect('/admin/rooms');
    } catch (err) {
      req.flash('error', err.message || 'Error creating room');
      res.redirect('/admin/rooms/new');
    }
  }
);

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
      errors: req.flash('errors') || [],
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
    });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/rooms/:id',
  ensureAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['Standard', 'Deluxe', 'Suite'])
      .withMessage('Invalid category'),
    body('number').trim().notEmpty().withMessage('Room number is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 1 }).withMessage('Valid price required'),
    body('capacity').isInt({ min: 1 }).withMessage('Valid capacity required'),
    body('amenities').optional().isArray().withMessage('Amenities must be an array')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      const roomData = {
        name: req.body.name,
        category: req.body.category,
        number: req.body.number,
        description: req.body.description,
        price: parseFloat(req.body.price),
        capacity: parseInt(req.body.capacity),
        amenities: Array.isArray(req.body.amenities) ? req.body.amenities : []
      };

      if (!errors.isEmpty()) {
        req.flash('errors', errors.array());
        return res.render('admin/rooms/form', {
          title: 'Edit Room',
          room: { ...roomData, _id: req.params.id },
          errors: errors.array(),
          session: req.session,
          currentPath: req.path,
          messages: { success: req.flash('success'), error: req.flash('error') }
        });
      }

      const existingRoom = await Room.findOne({
        $or: [{ name: roomData.name }, { number: roomData.number }],
        _id: { $ne: req.params.id }
      });

      if (existingRoom) {
        req.flash('errors', [
          { msg: 'Room with this name or number already exists' }
        ]);
        return res.render('admin/rooms/form', {
          title: 'Edit Room',
          room: { ...roomData, _id: req.params.id },
          errors: [{ msg: 'Room with this name or number already exists' }],
          session: req.session,
          currentPath: req.path,
          messages: { success: req.flash('success'), error: req.flash('error') }
        });
      }

      await Room.findByIdAndUpdate(req.params.id, roomData);
      req.flash('success', 'Room updated successfully');
      res.redirect('/admin/rooms');
    } catch (err) {
      req.flash('error', err.message || 'Error updating room');
      res.redirect(`/admin/rooms/${req.params.id}/edit`);
    }
  }
);

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
      bookings,
      session: req.session,
      currentPath: req.path,
      messages: { success: req.flash('success'), error: req.flash('error') }
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