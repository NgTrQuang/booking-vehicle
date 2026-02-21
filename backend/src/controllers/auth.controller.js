/**
 * @module controllers/auth.controller
 * @description Request/Response handler cho authentication
 * @created 2026-02-11
 */

const authService = require('../services/auth.service');
const res = require('../utils/response');

const register = async (req, resp) => {
  try {
    const result = await authService.register(req.body);
    return res.created(resp, result, 'Đăng ký thành công');
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message || 'Lỗi server', status);
  }
};

const login = async (req, resp) => {
  try {
    const result = await authService.login(req.body);
    return res.success(resp, result, 'Đăng nhập thành công');
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message || 'Lỗi server', status);
  }
};

const getMe = async (req, resp) => {
  try {
    const result = await authService.getMe(req.user.userId);
    return res.success(resp, result);
  } catch (err) {
    const status = err.status || 500;
    return res.error(resp, err.message || 'Lỗi server', status);
  }
};

module.exports = { register, login, getMe };
