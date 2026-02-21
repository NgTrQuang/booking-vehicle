/**
 * @module app
 * @description Express app setup - middleware, routes, error handling
 * @created 2026-02-11
 */

const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { errorMiddleware, notFoundMiddleware } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const driverRoutes = require('./routes/driver.routes');
const passengerRoutes = require('./routes/passenger.routes');
const tripRoutes = require('./routes/trip.routes');

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (dev only)
if (env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ========================
// ROUTES
// ========================
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HPK GO API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/trips', tripRoutes);

// ========================
// ERROR HANDLING
// ========================
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = { app };
