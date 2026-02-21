/**
 * @migration 20260211_002_seed_sample_data
 * @description Seed dữ liệu mẫu: tài khoản driver, passenger + gán role
 * 
 * Mục đích:
 * - Tạo 2 driver mẫu + 1 passenger mẫu
 * - Gán role tương ứng qua account_roles
 * - Tạo profile cho mỗi account
 * 
 * @created 2026-02-11
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: parseInt(process.env.DB_PORT) || 5432,
//   database: process.env.DB_NAME,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const SALT_ROUNDS = 10;

const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash('123456', SALT_ROUNDS);

    // Tạo drivers
    const d1 = await client.query(
      `INSERT INTO accounts (name, email, password_hash, phone)
       VALUES ('Tài Xế A', 'driver1@test.com', $1, '0901000001')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [hash]
    );
    const d2 = await client.query(
      `INSERT INTO accounts (name, email, password_hash, phone)
       VALUES ('Tài Xế B', 'driver2@test.com', $1, '0901000002')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [hash]
    );

    // Tạo passenger
    const p1 = await client.query(
      `INSERT INTO accounts (name, email, password_hash, phone)
       VALUES ('Hành Khách A', 'passenger1@test.com', $1, '0901000003')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [hash]
    );

    // Lấy role IDs
    const driverRole = await client.query(`SELECT id FROM roles WHERE name = 'DRIVER'`);
    const passengerRole = await client.query(`SELECT id FROM roles WHERE name = 'PASSENGER'`);

    const driverRoleId = driverRole.rows[0]?.id;
    const passengerRoleId = passengerRole.rows[0]?.id;

    // Gán roles
    if (d1.rows[0] && driverRoleId) {
      await client.query(
        `INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [d1.rows[0].id, driverRoleId]
      );
      await client.query(
        `INSERT INTO drivers_profile (account_id, vehicle_type, plate_number, status)
         VALUES ($1, 'Xe máy', '59A-12345', 'OFFLINE') ON CONFLICT DO NOTHING`,
        [d1.rows[0].id]
      );
    }

    if (d2.rows[0] && driverRoleId) {
      await client.query(
        `INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [d2.rows[0].id, driverRoleId]
      );
      await client.query(
        `INSERT INTO drivers_profile (account_id, vehicle_type, plate_number, status)
         VALUES ($1, 'Ô tô', '59B-67890', 'OFFLINE') ON CONFLICT DO NOTHING`,
        [d2.rows[0].id]
      );
    }

    if (p1.rows[0] && passengerRoleId) {
      await client.query(
        `INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [p1.rows[0].id, passengerRoleId]
      );
      await client.query(
        `INSERT INTO passengers_profile (account_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [p1.rows[0].id]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed UP completed: 20260211_002_seed_sample_data');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM accounts WHERE email IN ('driver1@test.com', 'driver2@test.com', 'passenger1@test.com')`);
    await client.query('COMMIT');
    console.log('✅ Seed DOWN completed: 20260211_002_seed_sample_data');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed rollback failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const action = process.argv[2];
if (action === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node migrations/20260211_002_seed_sample_data.js [up|down]');
  process.exit(0);
}

module.exports = { up, down };
