/**
 * @migration 20260211_001_init_hybrid_rbac_schema
 * @description Khởi tạo toàn bộ schema database với hybrid RBAC
 * 
 * Mục đích:
 * - Tạo bảng accounts (thay thế users cũ)
 * - Tạo bảng roles, permissions (RBAC)
 * - Tạo bảng account_roles (many-to-many: account <-> role)
 * - Tạo bảng role_permissions (many-to-many: role <-> permission)
 * - Tạo bảng account_permissions (many-to-many: account <-> permission trực tiếp)
 * - Tạo bảng drivers_profile, passengers_profile
 * - Tạo bảng driver_locations, trips
 * - Seed roles + permissions mặc định
 * 
 * @created 2026-02-11
 */

const { Pool } = require('pg');
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

const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Extension UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // ========================
    // ACCOUNTS (thay thế users cũ)
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ========================
    // ROLES
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ========================
    // PERMISSIONS
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ========================
    // ACCOUNT_ROLES (many-to-many)
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_roles (
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (account_id, role_id)
      )
    `);

    // ========================
    // ROLE_PERMISSIONS (many-to-many)
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // ========================
    // ACCOUNT_PERMISSIONS (many-to-many, gán trực tiếp)
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_permissions (
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (account_id, permission_id)
      )
    `);

    // ========================
    // DRIVERS_PROFILE
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers_profile (
        account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        vehicle_type VARCHAR(50),
        plate_number VARCHAR(20),
        status VARCHAR(20) DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'BUSY'))
      )
    `);

    // ========================
    // PASSENGERS_PROFILE
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS passengers_profile (
        account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        default_payment_method VARCHAR(50) DEFAULT 'CASH'
      )
    `);

    // ========================
    // DRIVER_LOCATIONS
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        driver_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ========================
    // TRIPS
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        passenger_id UUID REFERENCES accounts(id),
        driver_id UUID REFERENCES accounts(id),
        pickup_lat DOUBLE PRECISION,
        pickup_lng DOUBLE PRECISION,
        dropoff_lat DOUBLE PRECISION,
        dropoff_lng DOUBLE PRECISION,
        distance DOUBLE PRECISION,
        duration DOUBLE PRECISION,
        status VARCHAR(30) DEFAULT 'REQUESTED'
          CHECK (status IN ('REQUESTED','DRIVER_ASSIGNED','ACCEPTED','ARRIVED','ON_TRIP','COMPLETED','CANCELLED')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ========================
    // SEED DEFAULT ROLES
    // ========================
    await client.query(`
      INSERT INTO roles (name, description) VALUES
        ('ADMIN', 'Quản trị viên hệ thống'),
        ('DRIVER', 'Tài xế'),
        ('PASSENGER', 'Hành khách')
      ON CONFLICT (name) DO NOTHING
    `);

    // ========================
    // SEED DEFAULT PERMISSIONS
    // ========================
    await client.query(`
      INSERT INTO permissions (name, description) VALUES
        ('user:read', 'Xem thông tin user'),
        ('user:write', 'Chỉnh sửa thông tin user'),
        ('user:delete', 'Xóa user'),
        ('driver:read', 'Xem thông tin driver'),
        ('driver:write', 'Chỉnh sửa thông tin driver'),
        ('passenger:read', 'Xem thông tin passenger'),
        ('passenger:write', 'Chỉnh sửa thông tin passenger'),
        ('trip:read', 'Xem thông tin chuyến đi'),
        ('trip:create', 'Tạo chuyến đi'),
        ('trip:update', 'Cập nhật chuyến đi'),
        ('trip:cancel', 'Hủy chuyến đi'),
        ('role:manage', 'Quản lý roles'),
        ('permission:manage', 'Quản lý permissions')
      ON CONFLICT (name) DO NOTHING
    `);

    // ========================
    // ASSIGN DEFAULT PERMISSIONS TO ROLES
    // ========================
    // ADMIN gets all permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);

    // DRIVER gets driver-specific permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'DRIVER' AND p.name IN ('driver:read', 'driver:write', 'trip:read', 'trip:update')
      ON CONFLICT DO NOTHING
    `);

    // PASSENGER gets passenger-specific permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'PASSENGER' AND p.name IN ('passenger:read', 'passenger:write', 'trip:read', 'trip:create', 'trip:cancel')
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Migration UP completed: 20260211_001_init_hybrid_rbac_schema');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS trips CASCADE');
    await client.query('DROP TABLE IF EXISTS driver_locations CASCADE');
    await client.query('DROP TABLE IF EXISTS passengers_profile CASCADE');
    await client.query('DROP TABLE IF EXISTS drivers_profile CASCADE');
    await client.query('DROP TABLE IF EXISTS account_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS account_roles CASCADE');
    await client.query('DROP TABLE IF EXISTS permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS roles CASCADE');
    await client.query('DROP TABLE IF EXISTS accounts CASCADE');
    await client.query('COMMIT');
    console.log('✅ Migration DOWN completed: 20260211_001_init_hybrid_rbac_schema');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

// CLI runner
const action = process.argv[2];
if (action === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node migrations/20260211_001_init_hybrid_rbac_schema.js [up|down]');
  process.exit(0);
}

module.exports = { up, down };
