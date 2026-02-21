/**
 * @module routes/auth.routes
 * @description Định tuyến API cho authentication
 * @created 2026-02-11
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { validateRequired, validateEmail, validatePassword } = require('../middlewares/validate.middleware');

// POST /api/auth/register
router.post(
  '/register',
  validateRequired(['name', 'email', 'password', 'role']),
  validateEmail,
  validatePassword,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequired(['email', 'password']),
  authController.login
);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
