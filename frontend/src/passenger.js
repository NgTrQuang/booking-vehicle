import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL, saveAuth, getToken, getUser, clearAuth, isLoggedIn, apiFetch } from './config.js';

// ========================
// STATE
// ========================
let map, pickupMarker, dropoffMarker, routeLine, driverMarker;
let currentTripId = null;
let pickupLatLng = null;
let dropoffLatLng = null;
let tripData = {};
let socket = null;

// ========================
// AUTH
// ========================
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Vui lòng nhập email và mật khẩu';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      errorEl.textContent = json.message || 'Đăng nhập thất bại';
      return;
    }

    const { user, token, role } = json.data;

    if (role !== 'PASSENGER') {
      errorEl.textContent = 'Tài khoản này không phải khách hàng. Vui lòng dùng trang tài xế.';
      return;
    }

    saveAuth(token, { ...user, role });
    onAuthSuccess({ ...user, role });
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';

  if (!name || !email || !password) {
    errorEl.textContent = 'Vui lòng điền đầy đủ thông tin';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Mật khẩu tối thiểu 6 ký tự';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'PASSENGER' }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      errorEl.textContent = json.message || 'Đăng ký thất bại';
      return;
    }

    const { user, token } = json.data;
    saveAuth(token, { ...user, role: 'PASSENGER' });
    onAuthSuccess({ ...user, role: 'PASSENGER' });
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

function logout() {
  clearAuth();
  if (socket) socket.disconnect();
  socket = null;
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mapScreen').style.display = 'none';
  document.getElementById('btnLogout').style.display = 'none';
  document.getElementById('userInfo').textContent = 'Chưa đăng nhập';
}

function showRegister() {
  document.getElementById('auth-login').style.display = 'none';
  document.getElementById('auth-register').style.display = 'block';
}

function showLogin() {
  document.getElementById('auth-register').style.display = 'none';
  document.getElementById('auth-login').style.display = 'block';
}

function onAuthSuccess(user) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mapScreen').style.display = 'block';
  document.getElementById('userInfo').textContent = user.name;
  document.getElementById('btnLogout').style.display = 'block';

  initMap();
  connectSocket();
}

// ========================
// SOCKET
// ========================
function connectSocket() {
  const token = getToken();
  if (!token) return;

  socket = io(SOCKET_URL, {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket auth error:', err.message);
    if (err.message === 'Authentication required' || err.message === 'Invalid token') {
      logout();
    }
  });

  // Trip events
  socket.on('trip:searching', ({ tripId, driversCount }) => {
    currentTripId = tripId;
    document.getElementById('searchingText').textContent = `Tìm thấy ${driversCount} tài xế, đang gửi yêu cầu...`;
  });

  socket.on('trip:accepted', ({ trip, driver }) => {
    currentTripId = trip.id;

    document.getElementById('driverName').textContent = driver.name;
    document.getElementById('driverPlate').textContent = `🚗 ${driver.plate_number}`;
    document.getElementById('driverVehicle').textContent = `🏍️ ${driver.vehicle_type}`;
    document.getElementById('trackDistance').textContent = `${trip.distance} km`;
    document.getElementById('trackPrice').textContent = formatCurrency(calculatePrice(trip.distance));
    document.getElementById('tripStatusBadge').textContent = 'Tài xế đang đến';
    document.getElementById('tripStatusBadge').className = 'status-badge status-accepted';

    if (driver.lat && driver.lng) {
      showDriverOnMap(driver.lat, driver.lng);
      fetchDriverToPickupRoute(driver.lat, driver.lng);
    }

    showStep('step-tracking');
  });

  socket.on('driver:location_update', ({ driverId, lat, lng }) => {
    showDriverOnMap(lat, lng);
  });

  socket.on('trip:driver_arrived', ({ tripId }) => {
    document.getElementById('tripStatusBadge').textContent = 'Tài xế đã đến!';
    document.getElementById('tripStatusBadge').className = 'status-badge status-arrived';
    document.getElementById('btnCancelTracking').style.display = 'none';
  });

  socket.on('trip:started', ({ tripId, trip }) => {
    document.getElementById('tripStatusBadge').textContent = 'Đang trên chuyến';
    document.getElementById('tripStatusBadge').className = 'status-badge status-ontrip';
    document.getElementById('btnCancelTracking').style.display = 'none';

    if (routeLine) map.removeLayer(routeLine);
    fetchRouteAndDraw(trip.pickup_lat, trip.pickup_lng, trip.dropoff_lat, trip.dropoff_lng, '#0066ff');
  });

  socket.on('trip:finished', ({ tripId, trip }) => {
    document.getElementById('finalPrice').textContent = formatCurrency(calculatePrice(trip.distance));
    showStep('step-finished');
    if (driverMarker) map.removeLayer(driverMarker);
    driverMarker = null;
  });

  socket.on('trip:no_driver', ({ tripId, message }) => {
    alert(message);
    currentTripId = null;
    showStep('step-input');
  });

  socket.on('trip:restored', ({ trip, driverLocation }) => {
    currentTripId = trip.id;
    tripData = {
      distance: trip.distance,
      duration: trip.duration,
    };

    setPickup(trip.pickup_lat, trip.pickup_lng);
    setDropoff(trip.dropoff_lat, trip.dropoff_lng);

    if (['ACCEPTED', 'ARRIVED', 'ON_TRIP'].includes(trip.status)) {
      document.getElementById('driverName').textContent = trip.driver_name || '--';
      document.getElementById('driverPlate').textContent = `🚗 ${trip.plate_number || '--'}`;
      document.getElementById('driverVehicle').textContent = `🏍️ ${trip.vehicle_type || '--'}`;
      document.getElementById('trackDistance').textContent = `${trip.distance} km`;
      document.getElementById('trackPrice').textContent = formatCurrency(calculatePrice(trip.distance));

      if (trip.status === 'ACCEPTED') {
        document.getElementById('tripStatusBadge').textContent = 'Tài xế đang đến';
        document.getElementById('tripStatusBadge').className = 'status-badge status-accepted';
      } else if (trip.status === 'ARRIVED') {
        document.getElementById('tripStatusBadge').textContent = 'Tài xế đã đến!';
        document.getElementById('tripStatusBadge').className = 'status-badge status-arrived';
        document.getElementById('btnCancelTracking').style.display = 'none';
      } else if (trip.status === 'ON_TRIP') {
        document.getElementById('tripStatusBadge').textContent = 'Đang trên chuyến';
        document.getElementById('tripStatusBadge').className = 'status-badge status-ontrip';
        document.getElementById('btnCancelTracking').style.display = 'none';
      }

      if (driverLocation) {
        showDriverOnMap(driverLocation.lat, driverLocation.lng);
      }

      showStep('step-tracking');
    } else if (trip.status === 'REQUESTED' || trip.status === 'DRIVER_ASSIGNED') {
      showStep('step-searching');
    }
  });
}

// ========================
// MAP INIT
// ========================
function initMap() {
  if (map) return; // already initialized
  map = L.map('map', { zoomControl: false }).setView([10.7769, 106.7009], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  map.on('click', onMapClick);
}

function onMapClick(e) {
  const { lat, lng } = e.latlng;
  if (currentTripId) return;

  if (!pickupLatLng) {
    setPickup(lat, lng);
  } else if (!dropoffLatLng) {
    setDropoff(lat, lng);
  }
}

function setPickup(lat, lng) {
  pickupLatLng = { lat, lng };
  document.getElementById('pickupLat').value = lat.toFixed(6);
  document.getElementById('pickupLng').value = lng.toFixed(6);

  if (pickupMarker) map.removeLayer(pickupMarker);
  pickupMarker = L.marker([lat, lng], {
    icon: createIcon('📍'),
  }).addTo(map).bindPopup('Điểm đón').openPopup();
}

function setDropoff(lat, lng) {
  dropoffLatLng = { lat, lng };
  document.getElementById('dropoffLat').value = lat.toFixed(6);
  document.getElementById('dropoffLng').value = lng.toFixed(6);

  if (dropoffMarker) map.removeLayer(dropoffMarker);
  dropoffMarker = L.marker([lat, lng], {
    icon: createIcon('🏁'),
  }).addTo(map).bindPopup('Điểm đến').openPopup();

  const bounds = L.latLngBounds([pickupLatLng.lat, pickupLatLng.lng], [lat, lng]);
  map.fitBounds(bounds, { padding: [60, 60] });

  fetchRoute();
}

function createIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size:28px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    className: '',
  });
}

// ========================
// ROUTING (OSRM)
// ========================
async function fetchRoute() {
  if (!pickupLatLng || !dropoffLatLng) return;

  const url = `https://router.project-osrm.org/route/v1/driving/${pickupLatLng.lng},${pickupLatLng.lat};${dropoffLatLng.lng},${dropoffLatLng.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
      const durationMin = parseFloat((route.duration / 60).toFixed(0));
      const price = calculatePrice(distanceKm);

      if (routeLine) map.removeLayer(routeLine);
      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      routeLine = L.polyline(coords, {
        color: '#00b14f',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(routeLine.getBounds(), { padding: [60, 120] });

      document.getElementById('distanceText').textContent = `${distanceKm} km`;
      document.getElementById('durationText').textContent = `${durationMin} phút`;
      document.getElementById('priceText').textContent = formatCurrency(price);
      document.getElementById('routeInfo').style.display = 'block';
      document.getElementById('btnBook').disabled = false;

      tripData = { distance: distanceKm, duration: durationMin };
    }
  } catch (err) {
    console.error('Route fetch error:', err);
    alert('Không thể tính tuyến đường. Vui lòng thử lại.');
  }
}

function calculatePrice(distanceKm) {
  const baseFare = 12000;
  const perKm = 8500;
  return Math.round((baseFare + distanceKm * perKm) / 1000) * 1000;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// ========================
// GPS
// ========================
function getMyLocation() {
  if (!navigator.geolocation) {
    alert('Trình duyệt không hỗ trợ GPS');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      map.setView([lat, lng], 16);
      setPickup(lat, lng);
    },
    (err) => {
      console.error('GPS error:', err);
      alert('Không thể lấy vị trí. Vui lòng bật GPS.');
    },
    { enableHighAccuracy: true }
  );
}

// ========================
// TRIP REQUEST
// ========================
function requestTrip() {
  if (!pickupLatLng || !dropoffLatLng || !socket) return;

  socket.emit('passenger:request_trip', {
    pickupLat: pickupLatLng.lat,
    pickupLng: pickupLatLng.lng,
    dropoffLat: dropoffLatLng.lat,
    dropoffLng: dropoffLatLng.lng,
    distance: tripData.distance,
    duration: tripData.duration,
  });

  showStep('step-searching');
}

function cancelTrip() {
  if (currentTripId && socket) {
    socket.emit('passenger:cancel_trip', { tripId: currentTripId });
  }
  resetAll();
}

function resetSelection() {
  if (pickupMarker) map.removeLayer(pickupMarker);
  if (dropoffMarker) map.removeLayer(dropoffMarker);
  if (routeLine) map.removeLayer(routeLine);
  pickupMarker = null;
  dropoffMarker = null;
  routeLine = null;
  pickupLatLng = null;
  dropoffLatLng = null;
  tripData = {};

  document.getElementById('pickupLat').value = '';
  document.getElementById('pickupLng').value = '';
  document.getElementById('dropoffLat').value = '';
  document.getElementById('dropoffLng').value = '';
  document.getElementById('routeInfo').style.display = 'none';
  document.getElementById('btnBook').disabled = true;
}

function resetAll() {
  currentTripId = null;
  resetSelection();
  if (driverMarker) map.removeLayer(driverMarker);
  driverMarker = null;
  showStep('step-input');
}

// ========================
// MAP HELPERS
// ========================
function showDriverOnMap(lat, lng) {
  if (!driverMarker) {
    driverMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: '<div style="font-size:32px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚗</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      }),
    }).addTo(map);
  } else {
    driverMarker.setLatLng([lat, lng]);
  }
}

async function fetchDriverToPickupRoute(driverLat, driverLng) {
  if (!pickupLatLng) return;
  await fetchRouteAndDraw(driverLat, driverLng, pickupLatLng.lat, pickupLatLng.lng, '#ff6600');
}

async function fetchRouteAndDraw(fromLat, fromLng, toLat, toLng, color) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      if (routeLine) map.removeLayer(routeLine);
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      routeLine = L.polyline(coords, { color, weight: 5, opacity: 0.8 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [60, 120] });
    }
  } catch (err) {
    console.error('Route error:', err);
  }
}

// ========================
// UI HELPERS
// ========================
function showStep(stepId) {
  ['step-input', 'step-searching', 'step-tracking', 'step-finished'].forEach(id => {
    document.getElementById(id).style.display = id === stepId ? 'block' : 'none';
  });
}

// ========================
// EXPOSE TO HTML onclick handlers
// ========================
window.__app = {
  login,
  register,
  logout,
  showRegister,
  showLogin,
  getMyLocation,
  requestTrip,
  cancelTrip,
  resetSelection,
  resetAll,
};

// ========================
// INIT - check existing session
// ========================
if (isLoggedIn()) {
  const user = getUser();
  if (user && user.role === 'PASSENGER') {
    onAuthSuccess(user);
  } else {
    clearAuth();
  }
}
