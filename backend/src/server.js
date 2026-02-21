/**
 * @module server
 * @description HTTP + Socket.io server entry point
 * @created 2026-02-11
 */

const http = require('http');
const { app } = require('./app');
const { env } = require('./config/env');
const { pool } = require('./config/database');
// const { connectRedis } = require('./config/redis');
const { createSocketServer } = require('./config/socket');
const { setupSocket } = require('./sockets/socket.handler');
const logger = require('./utils/logger');

const server = http.createServer(app);
const io = createSocketServer(server);

// Setup socket events
setupSocket(io);

const start = async () => {
  try {
    // Test PostgreSQL connection
    const dbResult = await pool.query('SELECT NOW()');
    logger.success(`PostgreSQL connected: ${dbResult.rows[0].now}`);

    // Connect Redis
    // await connectRedis();
    // logger.success('Redis connected');

    // Start HTTP server
    server.listen(env.PORT, () => {
      logger.success(`Server running on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info('API endpoints:');
      logger.info('  GET  /api/health');
      logger.info('  POST /api/auth/register');
      logger.info('  POST /api/auth/login');
      logger.info('  GET  /api/auth/me');
      logger.info('  GET  /api/users');
      logger.info('  GET  /api/drivers');
      logger.info('  GET  /api/passengers');
      logger.info('  GET  /api/trips');
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
