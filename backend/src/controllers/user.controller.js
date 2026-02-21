/**
 * @module controllers/user.controller
 * @description Request/Response handler cho user/account management
 * @created 2026-02-11
 */

const userService = require('../services/user.service');
const res = require('../utils/response');

const getAll = async (req, resp) => {
  try {
    const accounts = await userService.getAllAccounts();
    return res.success(resp, accounts);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getById = async (req, resp) => {
  try {
    const account = await userService.getAccountById(req.params.id);
    if (!account) return res.notFound(resp, 'User không tồn tại');
    return res.success(resp, account);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const update = async (req, resp) => {
  try {
    if (req.user.userId !== req.params.id) {
      // Kiểm tra có role ADMIN không
      const roles = await userService.getRolesForAccount(req.user.userId);
      const isAdmin = roles.some((r) => r.name === 'ADMIN');
      if (!isAdmin) return res.forbidden(resp, 'Không có quyền chỉnh sửa user khác');
    }
    const account = await userService.updateAccount(req.params.id, req.body);
    if (!account) return res.notFound(resp, 'User không tồn tại');
    return res.success(resp, account, 'Cập nhật thành công');
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getRoles = async (req, resp) => {
  try {
    const roles = await userService.getRolesForAccount(req.params.id);
    return res.success(resp, roles);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getPermissions = async (req, resp) => {
  try {
    const permissions = await userService.getPermissionsForAccount(req.params.id);
    return res.success(resp, permissions);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const assignRole = async (req, resp) => {
  try {
    const { roleName } = req.body;
    if (!roleName) return res.badRequest(resp, 'Thiếu roleName');
    await userService.assignRole(req.params.id, roleName);
    return res.success(resp, null, `Đã gán role "${roleName}"`);
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message, status);
  }
};

const removeRole = async (req, resp) => {
  try {
    const { roleName } = req.body;
    if (!roleName) return res.badRequest(resp, 'Thiếu roleName');
    await userService.removeRole(req.params.id, roleName);
    return res.success(resp, null, `Đã xóa role "${roleName}"`);
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message, status);
  }
};

const assignPermission = async (req, resp) => {
  try {
    const { permissionName } = req.body;
    if (!permissionName) return res.badRequest(resp, 'Thiếu permissionName');
    await userService.assignPermission(req.params.id, permissionName);
    return res.success(resp, null, `Đã gán permission "${permissionName}"`);
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message, status);
  }
};

module.exports = { getAll, getById, update, getRoles, getPermissions, assignRole, removeRole, assignPermission };
