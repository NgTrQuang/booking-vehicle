/**
 * @module config/database
 * @description PostgreSQL connection pool
 * @created 2026-02-11
 */

const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// const pool = new Pool({
//   host: env.DB_HOST,
//   port: env.DB_PORT,
//   database: env.DB_NAME,
//   user: env.DB_USER,
//   password: env.DB_PASSWORD,
// });

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
