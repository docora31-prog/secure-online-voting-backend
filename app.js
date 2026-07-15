const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');
// Routes
const adminRoutes = require('./routes/adminRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const electionRoutes = require('./routes/electionRoutes');
const userRoutes = require('./routes/userRoutes');
const voteRoutes = require('./routes/voteRoutes');
const aiRoutes = require('./routes/aiRoutes');
const settingRoutes = require('./routes/settingRoutes');

// Environment Variable Validation
const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'AI_SERVICE_URL',
  'CLIENT_URL',
  'NODE_ENV',
  'COOKIE_SECRET'
];

// In development or if MONGO_URI is used instead of MONGODB_URI
if (process.env.MONGO_URI && !process.env.MONGODB_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
  } else {
    console.warn(`WARNING: Missing environment variables: ${missingEnv.join(', ')}. Local development is permitted, but some features may not work as expected.`);
  }
}

const app = express();

// Security and utility Middlewares
app.use(helmet());

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(url => url.trim()) : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' })); // Body parser, reading data from body into req.body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Route Registration
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/elections', electionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/votes', voteRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/settings', settingRoutes);

// Healthcheck
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
