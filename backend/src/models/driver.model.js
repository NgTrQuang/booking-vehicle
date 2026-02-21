/**
 * @module models/driver.model
 * @description PostgreSQL query layer cho drivers_profile + driver_locations
 * @created 2026-02-11
 */

const { query } = require('../config/database');

const findDriverById = async (driverId) => {
  const result = await query(
    `SELECT a.id, a.name, a.email, dp.vehicle_type, dp.plate_number, dp.status
     FROM accounts a
     JOIN drivers_profile dp ON a.id = dp.account_id
     WHERE a.id = $1`,
    [driverId]
  );
  return result.rows[0] || null;
};

const getAllDrivers = async () => {
  const result = await query(
    `SELECT a.id, a.name, a.email, dp.vehicle_type, dp.plate_number, dp.status
     FROM accounts a
     JOIN drivers_profile dp ON a.id = dp.account_id
     ORDER BY a.name`
  );
  return result.rows;
};

const getOnlineDrivers = async () => {
  const result = await query(
    `SELECT a.id, a.name, dp.vehicle_type, dp.plate_number, dp.status
     FROM accounts a
     JOIN drivers_profile dp ON a.id = dp.account_id
     WHERE dp.status = 'ONLINE'`
  );
  return result.rows;
};

const createProfile = async (accountId, { vehicle_type, plate_number }) => {
  await query(
    `INSERT INTO drivers_profile (account_id, vehicle_type, plate_number, status)
     VALUES ($1, $2, $3, 'OFFLINE')`,
    [accountId, vehicle_type || null, plate_number || null]
  );
};

const updateProfile = async (accountId, { vehicle_type, plate_number }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (vehicle_type !== undefined) { fields.push(`vehicle_type = $${idx++}`); values.push(vehicle_type); }
  if (plate_number !== undefined) { fields.push(`plate_number = $${idx++}`); values.push(plate_number); }

  if (fields.length === 0) return findDriverById(accountId);

  values.push(accountId);
  await query(
    `UPDATE drivers_profile SET ${fields.join(', ')} WHERE account_id = $${idx}`,
    values
  );
  return findDriverById(accountId);
};

const setStatus = async (accountId, status) => {
  await query(
    'UPDATE drivers_profile SET status = $1 WHERE account_id = $2',
    [status, accountId]
  );
};

const upsertLocation = async (driverId, lat, lng) => {
  await query(
    `INSERT INTO driver_locations (driver_id, lat, lng, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (driver_id) DO UPDATE SET lat = $2, lng = $3, updated_at = NOW()`,
    [driverId, lat, lng]
  );
};

module.exports = {
  findDriverById,
  getAllDrivers,
  getOnlineDrivers,
  createProfile,
  updateProfile,
  setStatus,
  upsertLocation,
};
