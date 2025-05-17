const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// GET /register
router.get('/register', (req, res) => {
  console.log('Handling GET /auth/register route');
  try {
    res.render('auth/register', { 
      title: 'Register',
      errors: [],
      csrfToken: null,
      currentPath: req.path,
      session: req.session
    });
  } catch (err) {
    console.error('Error rendering auth/register:', err);
    res.status(500).render('error', {
      title: '500 Error',
      error: { message: 'Error rendering registration page' },
      currentPath: req.path,
      session: req.session
    });
  }
});

// POST /register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors during registration:', errors.array());
    return res.render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      csrfToken: null,
      currentPath: req.path,
      session: req.session
    });
  }

  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    
    if (exists) {
      console.log('Email already in use:', email);
      return res.render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Email already in use' }],
        csrfToken: null,
        currentPath: req.path,
        session: req.session
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    
    console.log('User registered successfully:', email);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during registration:', err);
        return res.render('auth/register', {
          title: 'Register',
          errors: [{ msg: 'Session save failed' }],
          csrfToken: null,
          currentPath: req.path,
          session: req.session
        });
      }
      console.log('Session saved successfully after registration:', req.session);
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error during registration:', err.message);
    res.render('auth/register', {
      title: 'Register',
      errors: [{ msg: 'Registration failed' }],
      csrfToken: null,
      currentPath: req.path,
      session: req.session
    });
  }
});

// GET /login
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    title: 'Login',
    errors: [],
    success: req.flash('success'),
    csrfToken: null,
    currentPath: req.path,
    session: req.session
  });
});

// POST /login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors during login:', errors.array());
    return res.render('auth/login', {
      title: 'Login',
      errors: errors.array(),
      success: req.flash('success'),
      csrfToken: null,
      currentPath: req.path,
      session: req.session
    });
  }

  try {
    const { email, password } = req.body;
    console.log('Attempting login for:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found:', email);
      return res.render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Invalid credentials' }],
        success: req.flash('success'),
        csrfToken: null,
        currentPath: req.path,
        session: req.session
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Password mismatch for:', email);
      return res.render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Invalid credentials' }],
        success: req.flash('success'),
        csrfToken: null,
        currentPath: req.path,
        session: req.session
      });
    }

    console.log('Login successful, setting session for:', email);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during login:', err);
        return res.render('auth/login', {
          title: 'Login',
          errors: [{ msg: 'Session save failed' }],
          success: req.flash('success'),
          csrfToken: null,
          currentPath: req.path,
          session: req.session
        });
      }
      console.log('Session saved successfully after login:', req.session);
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.render('auth/login', {
      title: 'Login',
      errors: [{ msg: 'Login failed' }],
      success: req.flash('success'),
      csrfToken: null,
      currentPath: req.path,
      session: req.session
    });
  }
});

// GET /logout
router.get('/logout', (req, res, next) => {
  console.log('Logging out user:', req.session.userId);
  // Set flash message before destroying the session
  req.flash('success', 'You have been logged out successfully');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return next(err);
    }
    res.clearCookie('sid');
    res.redirect('/auth/login');
  });
});

module.exports = router;