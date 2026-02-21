/**
 * @module models/passenger.model
 * @description PostgreSQL query layer cho passengers_profile
 * @created 2026-02-11
 */

const { query } = require('../config/database');

const findPassengerById = async (passengerId) => {
  const result = await query(
    `SELECT a.id, a.name, a.email, pp.default_payment_method
     FROM accounts a
     JOIN passengers_profile pp ON a.id = pp.account_id
     WHERE a.id = $1`,
    [passengerId]
  );
  return result.rows[0] || null;
};

const getAllPassengers = async () => {
  const result = await query(
    `SELECT a.id, a.name, a.email, pp.default_payment_method
     FROM accounts a
     JOIN passengers_profile pp ON a.id = pp.account_id
     ORDER BY a.name`
  );
  return result.rows;
};

const createProfile = async (accountId) => {
  await query(
    'INSERT INTO passengers_profile (account_id) VALUES ($1)',
    [accountId]
  );
};

const updateProfile = async (accountId, { default_payment_method }) => {
  if (default_payment_method !== undefined) {
    await query(
      'UPDATE passengers_profile SET default_payment_method = $1 WHERE account_id = $2',
      [default_payment_method, accountId]
    );
  }
  return findPassengerById(accountId);
};

module.exports = {
  findPassengerById,
  getAllPassengers,
  createProfile,
  updateProfile,
};
