/**
 * @module services/dispatch.service
 * @description Business logic cho dispatch: Redis GEO driver locations, tìm tài xế gần nhất
 * @created 2026-02-11
 */

const { redisClient } = require('../config/redis');
const { query } = require('../config/database');
const driverModel = require('../models/driver.model');

const REDIS_DRIVER_GEO_KEY = 'driver_locations';
const SEARCH_RADII = [1, 3, 5]; // km

/**
 * Cập nhật vị trí tài xế vào Redis GEO + DB
 */
const updateDriverLocation = async (driverId, lat, lng) => {
  await redisClient.geoAdd(REDIS_DRIVER_GEO_KEY, {
    longitude: lng,
    latitude: lat,
    member: driverId,
  });
  await driverModel.upsertLocation(driverId, lat, lng);
};

/**
 * Xóa vị trí tài xế khỏi Redis
 */
const removeDriverLocation = async (driverId) => {
  await redisClient.zRem(REDIS_DRIVER_GEO_KEY, driverId);
};

/**
 * Tìm tài xế gần nhất trong bán kính mở rộng dần
 */
const findNearestDrivers = async (lat, lng, excludeIds = []) => {
  for (const radius of SEARCH_RADII) {
    // GEORADIUS tương thích Redis 3.2+
    const results = await redisClient.sendCommand([
      'GEORADIUS', REDIS_DRIVER_GEO_KEY,
      lng.toString(), lat.toString(),
      radius.toString(), 'km',
      'ASC',
    ]);

    if (results && results.length > 0) {
      const availableDrivers = [];
      for (const driverId of results) {
        if (excludeIds.includes(driverId)) continue;

        // Kiểm tra driver ONLINE
        const driverResult = await query(
          `SELECT a.id, a.name, dp.vehicle_type, dp.plate_number, dp.status
           FROM accounts a
           JOIN drivers_profile dp ON a.id = dp.account_id
           WHERE a.id = $1 AND dp.status = 'ONLINE'`,
          [driverId]
        );

        if (driverResult.rows.length > 0) {
          const pos = await _getGeoPos(driverId);
          if (pos) {
            availableDrivers.push({
              ...driverResult.rows[0],
              lat: pos.lat,
              lng: pos.lng,
            });
          }
        }
      }

      if (availableDrivers.length > 0) {
        return availableDrivers;
      }
    }
  }
  return [];
};

/**
 * Lấy vị trí tài xế từ Redis
 */
const getDriverLocation = async (driverId) => {
  return _getGeoPos(driverId);
};

/**
 * GEOPOS command (Redis 3.2+ compatible)
 */
const _getGeoPos = async (driverId) => {
  const result = await redisClient.sendCommand([
    'GEOPOS', REDIS_DRIVER_GEO_KEY, driverId,
  ]);
  if (result && result[0] && result[0][0] !== null) {
    return {
      lng: parseFloat(result[0][0]),
      lat: parseFloat(result[0][1]),
    };
  }
  return null;
};

/**
 * Set driver về ONLINE sau khi hoàn thành chuyến
 */
const setDriverOnline = async (driverId) => {
  await driverModel.setStatus(driverId, 'ONLINE');
};

module.exports = {
  updateDriverLocation,
  removeDriverLocation,
  findNearestDrivers,
  getDriverLocation,
  setDriverOnline,
};
