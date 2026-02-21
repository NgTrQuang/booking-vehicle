/**
 * @module utils/response
 * @description Helper chuẩn hóa response format cho API
 * @created 2026-02-11
 */

const success = (res, data = null, message = 'Thành công', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data = null, message = 'Tạo thành công') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Lỗi server', statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message,
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const badRequest = (res, message = 'Dữ liệu không hợp lệ', errors = null) => {
  return error(res, message, 400, errors);
};

const unauthorized = (res, message = 'Chưa xác thực') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Không có quyền truy cập') => {
  return error(res, message, 403);
};

const notFound = (res, message = 'Không tìm thấy') => {
  return error(res, message, 404);
};

const conflict = (res, message = 'Dữ liệu đã tồn tại') => {
  return error(res, message, 409);
};

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, conflict };
