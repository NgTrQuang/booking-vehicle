/**
 * @module services/auth.service
 * @description Business logic cho đăng ký, đăng nhập, lấy thông tin user
 * @created 2026-02-11
 */

const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');
const passengerModel = require('../models/passenger.model');

const SALT_ROUNDS = 10;

/**
 * Đăng ký tài khoản mới
 * @param {object} data - { name, email, password, role, vehicle_type?, plate_number? }
 */
const register = async ({ name, email, password, role, vehicle_type, plate_number }) => {
  // Kiểm tra email đã tồn tại
  const existing = await userModel.findAccountByEmail(email);
  if (existing) {
    throw { status: 409, message: 'Email đã được sử dụng' };
  }

  // Validate role
  const validRoles = ['PASSENGER', 'DRIVER'];
  if (!validRoles.includes(role)) {
    throw { status: 400, message: 'Role phải là PASSENGER hoặc DRIVER' };
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Tạo account
  const account = await userModel.createAccount({ name, email, password_hash });

  // Gán role
  const roleRecord = await userModel.findRoleByName(role);
  if (roleRecord) {
    await userModel.assignRoleToAccount(account.id, roleRecord.id);
  }

  // Tạo profile theo role
  if (role === 'DRIVER') {
    await driverModel.createProfile(account.id, { vehicle_type, plate_number });
  } else if (role === 'PASSENGER') {
    await passengerModel.createProfile(account.id);
  }

  // Tạo token
  const token = signToken({ userId: account.id, role });

  return { user: account, token };
};

/**
 * Đăng nhập
 * @param {object} data - { email, password }
 */
const login = async ({ email, password }) => {
  const account = await userModel.findAccountByEmail(email);
  if (!account) {
    throw { status: 401, message: 'Email hoặc mật khẩu không đúng' };
  }

  const validPassword = await bcrypt.compare(password, account.password_hash);
  if (!validPassword) {
    throw { status: 401, message: 'Email hoặc mật khẩu không đúng' };
  }

  // Lấy roles
  const roles = await userModel.getRolesByAccountId(account.id);
  const roleNames = roles.map((r) => r.name);
  const primaryRole = roleNames.includes('DRIVER') ? 'DRIVER' : roleNames.includes('PASSENGER') ? 'PASSENGER' : roleNames[0] || 'PASSENGER';

  // Lấy profile
  let profile = null;
  if (primaryRole === 'DRIVER') {
    profile = await driverModel.findDriverById(account.id);
  } else if (primaryRole === 'PASSENGER') {
    profile = await passengerModel.findPassengerById(account.id);
  }

  // Tạo token
  const token = signToken({ userId: account.id, role: primaryRole });

  const { password_hash, ...userWithoutPassword } = account;

  return { user: userWithoutPassword, role: primaryRole, roles: roleNames, profile, token };
};

/**
 * Lấy thông tin user hiện tại từ token
 * @param {string} userId
 */
const getMe = async (userId) => {
  const account = await userModel.findAccountById(userId);
  if (!account) {
    throw { status: 404, message: 'User không tồn tại' };
  }

  const roles = await userModel.getRolesByAccountId(userId);
  const roleNames = roles.map((r) => r.name);
  const primaryRole = roleNames.includes('DRIVER') ? 'DRIVER' : roleNames.includes('PASSENGER') ? 'PASSENGER' : roleNames[0];

  let profile = null;
  if (primaryRole === 'DRIVER') {
    profile = await driverModel.findDriverById(userId);
  } else if (primaryRole === 'PASSENGER') {
    profile = await passengerModel.findPassengerById(userId);
  }

  const permissions = await userModel.getPermissionsByAccountId(userId);

  return { user: account, role: primaryRole, roles: roleNames, permissions: permissions.map((p) => p.name), profile };
};

module.exports = { register, login, getMe };
