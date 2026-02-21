/**
 * @module controllers/passenger.controller
 * @description Request/Response handler cho passenger
 * @created 2026-02-11
 */

const passengerService = require('../services/passenger.service');
const res = require('../utils/response');

const getAll = async (req, resp) => {
  try {
    const passengers = await passengerService.getAllPassengers();
    return res.success(resp, passengers);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getById = async (req, resp) => {
  try {
    const passenger = await passengerService.getPassengerById(req.params.id);
    if (!passenger) return res.notFound(resp, 'Passenger không tồn tại');
    return res.success(resp, passenger);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const updateProfile = async (req, resp) => {
  try {
    const passenger = await passengerService.updateProfile(req.user.userId, req.body);
    return res.success(resp, passenger, 'Cập nhật profile thành công');
  } catch (err) {
    return res.error(resp, err.message);
  }
};

module.exports = { getAll, getById, updateProfile };
