// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// GET /register
router.get('/register', (req, res) => {
  res.render('auth/register', { 
    title: 'Register',
    errors: [],
    csrfToken: res.locals.csrfToken
  });
});

// POST /register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      csrfToken: res.locals.csrfToken
    });
  }

  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    
    if (exists) {
      return res.render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Email already in use' }],
        csrfToken: res.locals.csrfToken
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    
    req.session.userId = user._id;
    req.session.role = user.role;
    res.redirect('/');
  } catch (err) {
    res.render('auth/register', {
      title: 'Register',
      errors: [{ msg: 'Registration failed' }],
      csrfToken: res.locals.csrfToken
    });
  }
});

// GET /login
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    title: 'Login',
    errors: [],
    csrfToken: res.locals.csrfToken
  });
});

// POST /login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Login',
      errors: errors.array(),
      csrfToken: res.locals.csrfToken
    });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Invalid credentials' }],
        csrfToken: res.locals.csrfToken
      });
    }

    req.session.userId = user._id;
    req.session.role = user.role;
    res.redirect('/');
  } catch (err) {
    res.render('auth/login', {
      title: 'Login',
      errors: [{ msg: 'Login failed' }],
      csrfToken: res.locals.csrfToken
    });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.clearCookie('sid');
    res.redirect('/login');
  });
});

module.exports = router;