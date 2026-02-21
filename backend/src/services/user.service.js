/**
 * @module services/user.service
 * @description Business logic cho quản lý user/account
 * @created 2026-02-11
 */

const userModel = require('../models/user.model');

const getAllAccounts = async () => {
  return userModel.getAllAccounts();
};

const getAccountById = async (id) => {
  return userModel.findAccountById(id);
};

const updateAccount = async (id, data) => {
  return userModel.updateAccount(id, data);
};

const getRolesForAccount = async (accountId) => {
  return userModel.getRolesByAccountId(accountId);
};

const getPermissionsForAccount = async (accountId) => {
  return userModel.getPermissionsByAccountId(accountId);
};

const assignRole = async (accountId, roleName) => {
  const role = await userModel.findRoleByName(roleName);
  if (!role) throw { status: 404, message: `Role "${roleName}" không tồn tại` };
  await userModel.assignRoleToAccount(accountId, role.id);
};

const removeRole = async (accountId, roleName) => {
  const role = await userModel.findRoleByName(roleName);
  if (!role) throw { status: 404, message: `Role "${roleName}" không tồn tại` };
  await userModel.removeRoleFromAccount(accountId, role.id);
};

const assignPermission = async (accountId, permissionName) => {
  const perm = await userModel.findPermissionByName(permissionName);
  if (!perm) throw { status: 404, message: `Permission "${permissionName}" không tồn tại` };
  await userModel.assignPermissionToAccount(accountId, perm.id);
};

module.exports = {
  getAllAccounts,
  getAccountById,
  updateAccount,
  getRolesForAccount,
  getPermissionsForAccount,
  assignRole,
  removeRole,
  assignPermission,
};
