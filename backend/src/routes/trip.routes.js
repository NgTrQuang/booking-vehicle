/**
 * @module routes/trip.routes
 * @description Định tuyến API cho trip
 * @created 2026-02-11
 */

const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// GET /api/trips/active/passenger
router.get('/active/passenger', authMiddleware, requireRole('PASSENGER'), tripController.getActiveForPassenger);

// GET /api/trips/active/driver
router.get('/active/driver', authMiddleware, requireRole('DRIVER'), tripController.getActiveForDriver);

// GET /api/trips/history/me
router.get('/history/me', authMiddleware, tripController.getHistory);

// GET /api/trips/:id
router.get('/:id', authMiddleware, tripController.getById);

module.exports = router;
