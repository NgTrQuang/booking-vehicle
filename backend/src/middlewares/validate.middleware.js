/**
 * @module middlewares/validate.middleware
 * @description Validate request body theo schema đơn giản
 * @created 2026-02-11
 */

const res = require('../utils/response');

/**
 * Validate required fields trong req.body
 * @param {string[]} requiredFields - Danh sách field bắt buộc
 */
const validateRequired = (requiredFields) => {
  return (req, resp, next) => {
    const missing = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.badRequest(resp, `Thiếu trường bắt buộc: ${missing.join(', ')}`, { missing });
    }
    next();
  };
};

/**
 * Validate email format
 */
const validateEmail = (req, resp, next) => {
  const { email } = req.body;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.badRequest(resp, 'Email không hợp lệ');
  }
  next();
};

/**
 * Validate password length
 */
const validatePassword = (req, resp, next) => {
  const { password } = req.body;
  if (password && password.length < 6) {
    return res.badRequest(resp, 'Mật khẩu phải có ít nhất 6 ký tự');
  }
  next();
};

module.exports = { validateRequired, validateEmail, validatePassword };
