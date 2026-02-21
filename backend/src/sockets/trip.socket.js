/**
 * @module sockets/trip.socket
 * @description Socket events cho trip lifecycle (dispatch, accept, reject, status updates)
 * @created 2026-02-11
 */

const tripService = require('../services/trip.service');
const dispatchService = require('../services/dispatch.service');
const driverService = require('../services/driver.service');
const logger = require('../utils/logger');

// Track pending trip requests cho cascading dispatch
const pendingRequests = new Map(); // tripId -> { trip, candidates[], currentIndex, rejectedIds[] }

/**
 * Gửi yêu cầu chuyến đến tài xế tiếp theo trong danh sách
 */
const sendToNextDriver = (tripId, passengerSockets, driverSockets) => {
  const pending = pendingRequests.get(tripId);
  if (!pending) return;

  const { trip, candidates, currentIndex } = pending;

  if (currentIndex >= candidates.length) {
    logger.warn(`No driver accepted trip ${tripId}`);
    const passengerSocket = passengerSockets.get(trip.passenger_id);
    if (passengerSocket) {
      passengerSocket.emit('trip:no_driver', {
        tripId: trip.id,
        message: 'Tất cả tài xế đều từ chối hoặc không phản hồi.',
      });
    }
    tripService.updateStatus(trip.id, 'CANCELLED');
    pendingRequests.delete(tripId);
    return;
  }

  const driver = candidates[currentIndex];
  const driverSocket = driverSockets.get(driver.id);

  if (!driverSocket) {
    logger.info(`Driver ${driver.id} not connected, skipping`);
    pending.currentIndex++;
    sendToNextDriver(tripId, passengerSockets, driverSockets);
    return;
  }

  logger.info(`Sending trip request to driver ${driver.id}`);
  driverSocket.emit('trip:request', {
    tripId: trip.id,
    passengerId: trip.passenger_id,
    pickupLat: trip.pickup_lat,
    pickupLng: trip.pickup_lng,
    dropoffLat: trip.dropoff_lat,
    dropoffLng: trip.dropoff_lng,
    distance: trip.distance,
    duration: trip.duration,
  });

  // Auto-timeout: 15s
  setTimeout(() => {
    const currentPending = pendingRequests.get(tripId);
    if (currentPending && currentPending.currentIndex === candidates.indexOf(driver)) {
      logger.info(`Driver ${driver.id} timeout for trip ${tripId}`);
      currentPending.rejectedIds.push(driver.id);
      currentPending.currentIndex++;
      sendToNextDriver(tripId, passengerSockets, driverSockets);
    }
  }, 15000);
};

/**
 * Đăng ký tất cả trip socket events cho 1 connection
 */
const registerTripEvents = (socket, { userId, role }, passengerSockets, driverSockets) => {

  // ========================
  // DRIVER EVENTS
  // ========================

  socket.on('driver:go_online', async ({ lat, lng }) => {
    if (role !== 'DRIVER') return;
    await driverService.setStatus(userId, 'ONLINE');
    await dispatchService.updateDriverLocation(userId, lat, lng);
    logger.success(`Driver ${userId} is ONLINE at ${lat}, ${lng}`);
    socket.emit('driver:status_changed', { status: 'ONLINE' });
  });

  socket.on('driver:go_offline', async () => {
    if (role !== 'DRIVER') return;
    await driverService.setStatus(userId, 'OFFLINE');
    await dispatchService.removeDriverLocation(userId);
    logger.info(`Driver ${userId} is OFFLINE`);
    socket.emit('driver:status_changed', { status: 'OFFLINE' });
  });

  socket.on('driver:update_location', async ({ lat, lng }) => {
    if (role !== 'DRIVER') return;
    await dispatchService.updateDriverLocation(userId, lat, lng);

    // Nếu đang trên chuyến, broadcast vị trí cho passenger
    const activeTrip = await tripService.getActiveTripForDriver(userId);
    if (activeTrip) {
      const passengerSocket = passengerSockets.get(activeTrip.passenger_id);
      if (passengerSocket) {
        passengerSocket.emit('driver:location_update', {
          tripId: activeTrip.id,
          driverId: userId,
          lat,
          lng,
        });
      }
    }
  });

  socket.on('driver:accept_trip', async ({ tripId }) => {
    if (role !== 'DRIVER') return;
    logger.success(`Driver ${userId} accepted trip ${tripId}`);

    await tripService.assignDriver(tripId, userId);
    await tripService.updateStatus(tripId, 'ACCEPTED');
    const updatedTrip = await tripService.getTripById(tripId);
    const driverLocation = await dispatchService.getDriverLocation(userId);

    // Thông báo passenger
    const passengerSocket = passengerSockets.get(updatedTrip.passenger_id);
    if (passengerSocket) {
      passengerSocket.emit('trip:accepted', {
        trip: updatedTrip,
        driver: {
          id: userId,
          name: updatedTrip.driver_name,
          vehicle_type: updatedTrip.vehicle_type,
          plate_number: updatedTrip.plate_number,
          lat: driverLocation?.lat,
          lng: driverLocation?.lng,
        },
      });
    }

    // Thông báo driver
    socket.emit('trip:confirmed', { trip: updatedTrip });

    // Xóa pending request
    pendingRequests.delete(tripId);
  });

  socket.on('driver:reject_trip', async ({ tripId }) => {
    if (role !== 'DRIVER') return;
    logger.info(`Driver ${userId} rejected trip ${tripId}`);
    const pending = pendingRequests.get(tripId);
    if (!pending) return;

    pending.rejectedIds.push(userId);
    pending.currentIndex++;
    sendToNextDriver(tripId, passengerSockets, driverSockets);
  });

  socket.on('driver:arrived', async ({ tripId }) => {
    if (role !== 'DRIVER') return;
    logger.info(`Driver ${userId} arrived at pickup for trip ${tripId}`);
    const trip = await tripService.updateStatus(tripId, 'ARRIVED');

    const passengerSocket = passengerSockets.get(trip.passenger_id);
    if (passengerSocket) {
      passengerSocket.emit('trip:driver_arrived', { tripId });
    }
    socket.emit('trip:status_updated', { tripId, status: 'ARRIVED' });
  });

  socket.on('driver:start_trip', async ({ tripId }) => {
    if (role !== 'DRIVER') return;
    logger.info(`Trip ${tripId} started`);
    const trip = await tripService.updateStatus(tripId, 'ON_TRIP');

    const passengerSocket = passengerSockets.get(trip.passenger_id);
    if (passengerSocket) {
      passengerSocket.emit('trip:started', { tripId, trip });
    }
    socket.emit('trip:status_updated', { tripId, status: 'ON_TRIP' });
  });

  socket.on('driver:finish_trip', async ({ tripId }) => {
    if (role !== 'DRIVER') return;
    logger.info(`Trip ${tripId} finished`);
    const trip = await tripService.updateStatus(tripId, 'COMPLETED');
    await dispatchService.setDriverOnline(userId);

    const passengerSocket = passengerSockets.get(trip.passenger_id);
    if (passengerSocket) {
      passengerSocket.emit('trip:finished', { tripId, trip });
    }
    socket.emit('trip:status_updated', { tripId, status: 'COMPLETED' });
  });

  // ========================
  // PASSENGER EVENTS
  // ========================

  socket.on('passenger:request_trip', async (data) => {
    if (role !== 'PASSENGER') return;
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration } = data;

    logger.info(`New trip request from passenger ${userId}`);

    // Tạo trip trong DB
    const trip = await tripService.createTrip({
      passengerId: userId,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      distance,
      duration,
    });

    // Tìm tài xế gần nhất
    const drivers = await dispatchService.findNearestDrivers(pickupLat, pickupLng);

    if (drivers.length === 0) {
      socket.emit('trip:no_driver', { tripId: trip.id, message: 'Không tìm thấy tài xế khả dụng gần bạn.' });
      await tripService.updateStatus(trip.id, 'CANCELLED');
      return;
    }

    logger.info(`Found ${drivers.length} available drivers for trip ${trip.id}`);

    // Lưu pending request cho cascading dispatch
    pendingRequests.set(trip.id, {
      trip,
      candidates: drivers,
      currentIndex: 0,
      rejectedIds: [],
    });

    // Thông báo passenger đang tìm
    socket.emit('trip:searching', { tripId: trip.id, driversCount: drivers.length });

    // Gửi request cho tài xế đầu tiên
    sendToNextDriver(trip.id, passengerSockets, driverSockets);
  });

  socket.on('passenger:cancel_trip', async ({ tripId }) => {
    if (role !== 'PASSENGER') return;
    logger.info(`Passenger ${userId} cancelled trip ${tripId}`);

    const trip = await tripService.getTripById(tripId);
    if (trip && trip.driver_id) {
      const driverSocket = driverSockets.get(trip.driver_id);
      if (driverSocket) {
        driverSocket.emit('trip:cancelled', { tripId });
      }
      await dispatchService.setDriverOnline(trip.driver_id);
    }
    await tripService.updateStatus(tripId, 'CANCELLED');
    pendingRequests.delete(tripId);
  });
};

/**
 * Khôi phục trip đang active khi reconnect
 */
const restoreDriverTrip = async (socket, driverId) => {
  const trip = await tripService.getActiveTripForDriver(driverId);
  if (trip) {
    socket.emit('trip:restored', trip);
  }
};

const restorePassengerTrip = async (socket, passengerId) => {
  const trip = await tripService.getActiveTripForPassenger(passengerId);
  if (trip) {
    let driverLocation = null;
    if (trip.driver_id) {
      driverLocation = await dispatchService.getDriverLocation(trip.driver_id);
    }
    socket.emit('trip:restored', { trip, driverLocation });
  }
};

module.exports = { registerTripEvents, restoreDriverTrip, restorePassengerTrip };
