/**
 * @module services/trip.service
 * @description Business logic cho trip lifecycle
 * @created 2026-02-11
 */

const tripModel = require('../models/trip.model');

const createTrip = async (data) => {
  return tripModel.createTrip(data);
};

const getTripById = async (tripId) => {
  return tripModel.findTripById(tripId);
};

const assignDriver = async (tripId, driverId) => {
  await tripModel.assignDriver(tripId, driverId);
  return tripModel.findTripById(tripId);
};

const updateStatus = async (tripId, status) => {
  return tripModel.updateStatus(tripId, status);
};

const getActiveTripForPassenger = async (passengerId) => {
  return tripModel.getActiveTripForPassenger(passengerId);
};

const getActiveTripForDriver = async (driverId) => {
  return tripModel.getActiveTripForDriver(driverId);
};

const getTripsHistory = async (accountId, roleName) => {
  return tripModel.getTripsHistory(accountId, roleName);
};

module.exports = {
  createTrip,
  getTripById,
  assignDriver,
  updateStatus,
  getActiveTripForPassenger,
  getActiveTripForDriver,
  getTripsHistory,
};
