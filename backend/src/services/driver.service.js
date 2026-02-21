/**
 * @module services/driver.service
 * @description Business logic cho driver
 * @created 2026-02-11
 */

const driverModel = require('../models/driver.model');

const getAllDrivers = async () => {
  return driverModel.getAllDrivers();
};

const getDriverById = async (driverId) => {
  return driverModel.findDriverById(driverId);
};

const getOnlineDrivers = async () => {
  return driverModel.getOnlineDrivers();
};

const updateProfile = async (accountId, data) => {
  return driverModel.updateProfile(accountId, data);
};

const setStatus = async (accountId, status) => {
  return driverModel.setStatus(accountId, status);
};

module.exports = { getAllDrivers, getDriverById, getOnlineDrivers, updateProfile, setStatus };
