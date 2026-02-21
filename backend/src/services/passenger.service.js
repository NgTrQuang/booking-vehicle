/**
 * @module services/passenger.service
 * @description Business logic cho passenger
 * @created 2026-02-11
 */

const passengerModel = require('../models/passenger.model');

const getAllPassengers = async () => {
  return passengerModel.getAllPassengers();
};

const getPassengerById = async (passengerId) => {
  return passengerModel.findPassengerById(passengerId);
};

const updateProfile = async (accountId, data) => {
  return passengerModel.updateProfile(accountId, data);
};

module.exports = { getAllPassengers, getPassengerById, updateProfile };
