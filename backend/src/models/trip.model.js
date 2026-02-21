/**
 * @module models/trip.model
 * @description PostgreSQL query layer cho trips
 * @created 2026-02-11
 */

const { query } = require('../config/database');

const createTrip = async ({ passengerId, pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration }) => {
  const result = await query(
    `INSERT INTO trips (passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance, duration, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED') RETURNING *`,
    [passengerId, pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration]
  );
  return result.rows[0];
};

const findTripById = async (tripId) => {
  const result = await query(
    `SELECT t.*,
            pa.name AS passenger_name, pa.email AS passenger_email,
            da.name AS driver_name, da.email AS driver_email,
            dp.vehicle_type, dp.plate_number
     FROM trips t
     LEFT JOIN accounts pa ON t.passenger_id = pa.id
     LEFT JOIN accounts da ON t.driver_id = da.id
     LEFT JOIN drivers_profile dp ON t.driver_id = dp.account_id
     WHERE t.id = $1`,
    [tripId]
  );
  return result.rows[0] || null;
};

const assignDriver = async (tripId, driverId) => {
  await query(
    `UPDATE trips SET driver_id = $1, status = 'DRIVER_ASSIGNED' WHERE id = $2`,
    [driverId, tripId]
  );
  await query(
    `UPDATE drivers_profile SET status = 'BUSY' WHERE account_id = $1`,
    [driverId]
  );
};

const updateStatus = async (tripId, status) => {
  await query(
    'UPDATE trips SET status = $1 WHERE id = $2',
    [status, tripId]
  );
  return findTripById(tripId);
};

const getActiveTripForPassenger = async (passengerId) => {
  const result = await query(
    `SELECT t.*,
            da.name AS driver_name,
            dp.vehicle_type, dp.plate_number
     FROM trips t
     LEFT JOIN accounts da ON t.driver_id = da.id
     LEFT JOIN drivers_profile dp ON t.driver_id = dp.account_id
     WHERE t.passenger_id = $1 AND t.status NOT IN ('COMPLETED', 'CANCELLED')
     ORDER BY t.created_at DESC LIMIT 1`,
    [passengerId]
  );
  return result.rows[0] || null;
};

const getActiveTripForDriver = async (driverId) => {
  const result = await query(
    `SELECT t.*,
            pa.name AS passenger_name, pa.email AS passenger_email
     FROM trips t
     LEFT JOIN accounts pa ON t.passenger_id = pa.id
     WHERE t.driver_id = $1 AND t.status NOT IN ('COMPLETED', 'CANCELLED')
     ORDER BY t.created_at DESC LIMIT 1`,
    [driverId]
  );
  return result.rows[0] || null;
};

const getTripsHistory = async (accountId, roleName) => {
  const column = roleName === 'DRIVER' ? 'driver_id' : 'passenger_id';
  const result = await query(
    `SELECT t.*,
            pa.name AS passenger_name,
            da.name AS driver_name,
            dp.plate_number
     FROM trips t
     LEFT JOIN accounts pa ON t.passenger_id = pa.id
     LEFT JOIN accounts da ON t.driver_id = da.id
     LEFT JOIN drivers_profile dp ON t.driver_id = dp.account_id
     WHERE t.${column} = $1
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [accountId]
  );
  return result.rows;
};

module.exports = {
  createTrip,
  findTripById,
  assignDriver,
  updateStatus,
  getActiveTripForPassenger,
  getActiveTripForDriver,
  getTripsHistory,
};
