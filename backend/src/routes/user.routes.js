/**
 * @module routes/user.routes
 * @description Định tuyến API cho user/account management
 * @created 2026-02-11
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// GET /api/users - Admin only
router.get('/', authMiddleware, requireRole('ADMIN'), userController.getAll);

// GET /api/users/:id
router.get('/:id', authMiddleware, userController.getById);

// PUT /api/users/:id
router.put('/:id', authMiddleware, userController.update);

// GET /api/users/:id/roles
router.get('/:id/roles', authMiddleware, userController.getRoles);

// GET /api/users/:id/permissions
router.get('/:id/permissions', authMiddleware, userController.getPermissions);

// POST /api/users/:id/roles - Admin only
router.post('/:id/roles', authMiddleware, requireRole('ADMIN'), userController.assignRole);

// DELETE /api/users/:id/roles - Admin only
router.delete('/:id/roles', authMiddleware, requireRole('ADMIN'), userController.removeRole);

// POST /api/users/:id/permissions - Admin only
router.post('/:id/permissions', authMiddleware, requireRole('ADMIN'), userController.assignPermission);

module.exports = router;
