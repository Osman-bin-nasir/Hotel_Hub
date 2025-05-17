require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
}));

// ========================
//  Application Middleware
// ========================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

// ========================
//  Session Configuration
// ========================
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  crypto: {
    secret: process.env.COOKIE_SECRET
  }
});

sessionStore.on('error', (error) => {
  console.error('Session store error:', error);
});

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure in production
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    signed: true,
    sameSite: 'lax'
  }
}));

app.use(flash());

// Log session for debugging
app.use((req, res, next) => {
  console.log('🔍 Session on request:', {
    sessionID: req.sessionID,
    userId: req.session.userId,
    path: req.path
  });
  next();
});

// ========================
//  View & Template Helpers
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentPath = req.path;
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
  console.error('Error:', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).render('error', {
    title: `${statusCode} Error`,
    error: { message: err.message || 'An unexpected error occurred' },
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