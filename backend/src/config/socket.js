/**
 * @module config/socket
 * @description Socket.io server configuration
 * @created 2026-02-11
 */

const { Server } = require('socket.io');
const { env } = require('./env');

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
      methods: ['GET', 'POST'],
    },
  });
  return io;
};

module.exports = { createSocketServer };
