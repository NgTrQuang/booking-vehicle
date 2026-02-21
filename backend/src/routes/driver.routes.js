/**
 * @module routes/driver.routes
 * @description Định tuyến API cho driver
 * @created 2026-02-11
 */

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// GET /api/drivers
router.get('/', authMiddleware, driverController.getAll);

// GET /api/drivers/online
router.get('/online', authMiddleware, driverController.getOnline);

// GET /api/drivers/:id
router.get('/:id', authMiddleware, driverController.getById);

// PUT /api/drivers/profile - Driver tự cập nhật profile
router.put('/profile', authMiddleware, requireRole('DRIVER'), driverController.updateProfile);

module.exports = router;
