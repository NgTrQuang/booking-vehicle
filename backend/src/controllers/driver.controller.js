/**
 * @module controllers/driver.controller
 * @description Request/Response handler cho driver
 * @created 2026-02-11
 */

const driverService = require('../services/driver.service');
const res = require('../utils/response');

const getAll = async (req, resp) => {
  try {
    const drivers = await driverService.getAllDrivers();
    return res.success(resp, drivers);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getOnline = async (req, resp) => {
  try {
    const drivers = await driverService.getOnlineDrivers();
    return res.success(resp, drivers);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getById = async (req, resp) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    if (!driver) return res.notFound(resp, 'Driver không tồn tại');
    return res.success(resp, driver);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const updateProfile = async (req, resp) => {
  try {
    const driver = await driverService.updateProfile(req.user.userId, req.body);
    return res.success(resp, driver, 'Cập nhật profile thành công');
  } catch (err) {
    return res.error(resp, err.message);
  }
};

module.exports = { getAll, getOnline, getById, updateProfile };
