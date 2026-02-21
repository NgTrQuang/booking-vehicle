/**
 * @module sockets/socket.handler
 * @description Socket.io main handler - authenticate + route events
 * @created 2026-02-11
 */

const { verifyToken } = require('../utils/jwt');
const { registerTripEvents, restoreDriverTrip, restorePassengerTrip } = require('./trip.socket');
const logger = require('../utils/logger');

// Track socket connections
const passengerSockets = new Map(); // userId -> socket
const driverSockets = new Map();    // userId -> socket

/**
 * Setup tất cả socket events cho io server
 */
const setupSocket = (io) => {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = verifyToken(token);
      socket.user = decoded; // { userId, role }
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    logger.socket(`Connected: ${socket.id} | User: ${userId} | Role: ${role}`);

    // Auto-register based on role
    if (role === 'DRIVER') {
      driverSockets.set(userId, socket);
      logger.info(`Driver registered: ${userId}`);
      restoreDriverTrip(socket, userId);
    } else if (role === 'PASSENGER') {
      passengerSockets.set(userId, socket);
      logger.info(`Passenger registered: ${userId}`);
      restorePassengerTrip(socket, userId);
    }

    // Register trip events
    registerTripEvents(socket, { userId, role }, passengerSockets, driverSockets);

    // Disconnect
    socket.on('disconnect', () => {
      if (role === 'DRIVER') {
        driverSockets.delete(userId);
        logger.socket(`Driver ${userId} disconnected`);
      } else if (role === 'PASSENGER') {
        passengerSockets.delete(userId);
        logger.socket(`Passenger ${userId} disconnected`);
      }
    });
  });
};

module.exports = { setupSocket };
