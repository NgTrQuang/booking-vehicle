/**
 * @module routes/passenger.routes
 * @description Định tuyến API cho passenger
 * @created 2026-02-11
 */

const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// GET /api/passengers
router.get('/', authMiddleware, passengerController.getAll);

// GET /api/passengers/:id
router.get('/:id', authMiddleware, passengerController.getById);

// PUT /api/passengers/profile - Passenger tự cập nhật profile
router.put('/profile', authMiddleware, requireRole('PASSENGER'), passengerController.updateProfile);

module.exports = router;
