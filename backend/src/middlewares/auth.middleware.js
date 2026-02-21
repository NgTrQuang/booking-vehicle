/**
 * @module middlewares/auth.middleware
 * @description JWT authentication + hybrid RBAC permission check
 * @created 2026-02-11
 */

const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');
const res = require('../utils/response');

const authMiddleware = (req, resp, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.unauthorized(resp, 'Token không hợp lệ hoặc thiếu');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    return res.unauthorized(resp, 'Token hết hạn hoặc không hợp lệ');
  }
};

/**
 * Kiểm tra role (RBAC cơ bản)
 * Cho phép nếu user có ít nhất 1 trong các roles được chỉ định
 */
const requireRole = (...roles) => {
  return async (req, resp, next) => {
    if (!req.user) {
      return res.unauthorized(resp);
    }

    try {
      // Lấy tất cả roles của account từ bảng account_roles
      const result = await query(
        `SELECT r.name FROM roles r
         JOIN account_roles ar ON r.id = ar.role_id
         WHERE ar.account_id = $1`,
        [req.user.userId]
      );

      const userRoles = result.rows.map((r) => r.name);

      const hasRole = roles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        return res.forbidden(resp, 'Bạn không có quyền truy cập (role)');
      }

      req.user.roles = userRoles;
      next();
    } catch (err) {
      return res.error(resp, 'Lỗi kiểm tra quyền');
    }
  };
};

/**
 * Kiểm tra permission cụ thể (hybrid RBAC)
 * Permission có thể đến từ role HOẶC gán trực tiếp cho account
 */
const requirePermission = (...permissions) => {
  return async (req, resp, next) => {
    if (!req.user) {
      return res.unauthorized(resp);
    }

    try {
      // Lấy permissions từ roles + permissions gán trực tiếp
      const result = await query(
        `SELECT DISTINCT p.name FROM permissions p
         LEFT JOIN role_permissions rp ON p.id = rp.permission_id
         LEFT JOIN account_roles ar ON rp.role_id = ar.role_id AND ar.account_id = $1
         LEFT JOIN account_permissions ap ON p.id = ap.permission_id AND ap.account_id = $1
         WHERE ar.account_id = $1 OR ap.account_id = $1`,
        [req.user.userId]
      );

      const userPermissions = result.rows.map((p) => p.name);

      const hasPermission = permissions.some((perm) => userPermissions.includes(perm));
      if (!hasPermission) {
        return res.forbidden(resp, 'Bạn không có quyền thực hiện hành động này');
      }

      req.user.permissions = userPermissions;
      next();
    } catch (err) {
      return res.error(resp, 'Lỗi kiểm tra quyền');
    }
  };
};

module.exports = { authMiddleware, requireRole, requirePermission };
