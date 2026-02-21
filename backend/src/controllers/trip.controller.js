/**
 * @module controllers/trip.controller
 * @description Request/Response handler cho trip
 * @created 2026-02-11
 */

const tripService = require('../services/trip.service');
const res = require('../utils/response');

const getById = async (req, resp) => {
  try {
    const trip = await tripService.getTripById(req.params.id);
    if (!trip) return res.notFound(resp, 'Trip không tồn tại');
    return res.success(resp, trip);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getActiveForPassenger = async (req, resp) => {
  try {
    const trip = await tripService.getActiveTripForPassenger(req.user.userId);
    return res.success(resp, trip);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getActiveForDriver = async (req, resp) => {
  try {
    const trip = await tripService.getActiveTripForDriver(req.user.userId);
    return res.success(resp, trip);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

const getHistory = async (req, resp) => {
  try {
    const trips = await tripService.getTripsHistory(req.user.userId, req.user.role);
    return res.success(resp, trips);
  } catch (err) {
    return res.error(resp, err.message);
  }
};

module.exports = { getById, getActiveForPassenger, getActiveForDriver, getHistory };
