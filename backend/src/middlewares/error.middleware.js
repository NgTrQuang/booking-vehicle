/**
 * @module middlewares/error.middleware
 * @description Global error handler middleware
 * @created 2026-02-11
 */

const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path} -`, err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi server nội bộ';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} không tồn tại`,
  });
};

module.exports = { errorMiddleware, notFoundMiddleware };
