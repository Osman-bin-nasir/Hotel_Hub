require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { doubleCsrf } = require('csrf-csrf');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const flash = require('express-flash');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const app = express();

// ========================
//  Database Connection
// ========================
const connectDB = require('./config/db');
connectDB();

// ========================
//  Security Middleware
// ========================
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// ========================
//  Application Middleware
// ========================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
// app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cookieParser());

// ========================
//  Session Configuration
// ========================
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    crypto: {
      secret: process.env.COOKIE_SECRET
    }
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2,
    signed: true
  }
}));

app.use(flash());

// ========================
//  CSRF Configuration
// ========================
const { doubleCsrfProtection, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => process.env.COOKIE_SECRET,
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',        // relaxed for local development
    secure: process.env.NODE_ENV === 'production',
    signed: false,
    secret: process.env.COOKIE_SECRET
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

app.use(doubleCsrfProtection);

// ========================
//  View & Template Helpers
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentPath = req.path;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ========================
//  Route Definitions
// ========================
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/rooms', require('./routes/rooms'));
app.use('/bookings', require('./routes/bookings'));
app.use('/admin', require('./routes/admin'));

// ========================
//  CSRF-Specific Error Handler
// ========================
app.use((err, req, res, next) => {
  if (err === invalidCsrfTokenError) {
    console.error('❌ CSRF token mismatch');
    return res.status(403).render('error', {
      title: '403 Forbidden',
      error: { message: 'Invalid CSRF token. Please refresh the page and try again.' },
      currentPath: req.path,
      session: req.session
    });
  }
  next(err);
});

// ========================
//  404 Handler
// ========================
app.use((req, res) => {
  res.status(404).render('error', { 
    title: '404 Not Found',
    error: { message: 'Page not found' },
    currentPath: req.path,
    session: req.session
  });
});

// ========================
//  General Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).render('error', {
    title: `${statusCode} Error`,
    error: err,
    currentPath: req.path,
    session: req.session
  });
});

// ========================
//  Server Initialization
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
