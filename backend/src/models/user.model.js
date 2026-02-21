/**
 * @module models/user.model
 * @description PostgreSQL query layer cho accounts, roles, permissions (hybrid RBAC)
 * @created 2026-02-11
 */

const { query } = require('../config/database');

// ========================
// ACCOUNTS
// ========================

const findAccountByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM accounts WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

const findAccountById = async (id) => {
  const result = await query(
    'SELECT id, name, email, phone, created_at FROM accounts WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const createAccount = async ({ name, email, password_hash, phone }) => {
  const result = await query(
    `INSERT INTO accounts (name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, created_at`,
    [name, email, password_hash, phone || null]
  );
  return result.rows[0];
};

const getAllAccounts = async () => {
  const result = await query(
    'SELECT id, name, email, phone, created_at FROM accounts ORDER BY created_at DESC'
  );
  return result.rows;
};

const updateAccount = async (id, { name, phone }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }

  if (fields.length === 0) return findAccountById(id);

  values.push(id);
  await query(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
  return findAccountById(id);
};

// ========================
// ROLES
// ========================

const findRoleByName = async (name) => {
  const result = await query('SELECT * FROM roles WHERE name = $1', [name]);
  return result.rows[0] || null;
};

const findRoleById = async (id) => {
  const result = await query('SELECT * FROM roles WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getAllRoles = async () => {
  const result = await query('SELECT * FROM roles ORDER BY name');
  return result.rows;
};

const getRolesByAccountId = async (accountId) => {
  const result = await query(
    `SELECT r.* FROM roles r
     JOIN account_roles ar ON r.id = ar.role_id
     WHERE ar.account_id = $1`,
    [accountId]
  );
  return result.rows;
};

const assignRoleToAccount = async (accountId, roleId) => {
  await query(
    `INSERT INTO account_roles (account_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id, role_id) DO NOTHING`,
    [accountId, roleId]
  );
};

const removeRoleFromAccount = async (accountId, roleId) => {
  await query(
    'DELETE FROM account_roles WHERE account_id = $1 AND role_id = $2',
    [accountId, roleId]
  );
};

// ========================
// PERMISSIONS
// ========================

const findPermissionByName = async (name) => {
  const result = await query('SELECT * FROM permissions WHERE name = $1', [name]);
  return result.rows[0] || null;
};

const getAllPermissions = async () => {
  const result = await query('SELECT * FROM permissions ORDER BY name');
  return result.rows;
};

const getPermissionsByRoleId = async (roleId) => {
  const result = await query(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return result.rows;
};

const getPermissionsByAccountId = async (accountId) => {
  const result = await query(
    `SELECT DISTINCT p.id, p.name, p.description FROM permissions p
     LEFT JOIN role_permissions rp ON p.id = rp.permission_id
     LEFT JOIN account_roles ar ON rp.role_id = ar.role_id AND ar.account_id = $1
     LEFT JOIN account_permissions ap ON p.id = ap.permission_id AND ap.account_id = $1
     WHERE ar.account_id = $1 OR ap.account_id = $1`,
    [accountId]
  );
  return result.rows;
};

const assignPermissionToAccount = async (accountId, permissionId) => {
  await query(
    `INSERT INTO account_permissions (account_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id, permission_id) DO NOTHING`,
    [accountId, permissionId]
  );
};

const assignPermissionToRole = async (roleId, permissionId) => {
  await query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
    [roleId, permissionId]
  );
};

module.exports = {
  findAccountByEmail,
  findAccountById,
  createAccount,
  getAllAccounts,
  updateAccount,
  findRoleByName,
  findRoleById,
  getAllRoles,
  getRolesByAccountId,
  assignRoleToAccount,
  removeRoleFromAccount,
  findPermissionByName,
  getAllPermissions,
  getPermissionsByRoleId,
  getPermissionsByAccountId,
  assignPermissionToAccount,
  assignPermissionToRole,
};
