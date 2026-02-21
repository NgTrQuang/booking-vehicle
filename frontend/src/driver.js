import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL, saveAuth, getToken, getUser, clearAuth, isLoggedIn, apiFetch } from './config.js';

// ========================
// STATE
// ========================
let driverStatus = 'OFFLINE';
let map, myMarker, pickupMarker, dropoffMarker, routeLine;
let currentTrip = null;
let currentTripRequest = null;
let countdownTimer = null;
let locationInterval = null;
let myLocation = null;
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

    const { user, token, role, profile } = json.data;

    if (role !== 'DRIVER') {
      errorEl.textContent = 'Tài khoản này không phải tài xế. Vui lòng dùng trang khách hàng.';
      return;
    }

    saveAuth(token, { ...user, role });
    onAuthSuccess({ ...user, role }, profile);
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const vehicleType = document.getElementById('regVehicleType').value;
  const plateNumber = document.getElementById('regPlateNumber').value.trim();
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';

  if (!name || !email || !password || !plateNumber) {
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
      body: JSON.stringify({ name, email, password, role: 'DRIVER', vehicle_type: vehicleType, plate_number: plateNumber }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      errorEl.textContent = json.message || 'Đăng ký thất bại';
      return;
    }

    const { user, token } = json.data;
    saveAuth(token, { ...user, role: 'DRIVER' });
    onAuthSuccess({ ...user, role: 'DRIVER' }, { vehicle_type: vehicleType, plate_number: plateNumber, status: 'OFFLINE' });
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối server';
  }
}

function logout() {
  clearAuth();
  if (socket) socket.disconnect();
  socket = null;
  stopGPSTracking();
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mapScreen').style.display = 'none';
  document.getElementById('btnLogout').style.display = 'none';
  document.getElementById('driverNameTop').textContent = 'Chưa đăng nhập';
}

function showRegister() {
  document.getElementById('auth-login').style.display = 'none';
  document.getElementById('auth-register').style.display = 'block';
}

function showLogin() {
  document.getElementById('auth-register').style.display = 'none';
  document.getElementById('auth-login').style.display = 'block';
}

function onAuthSuccess(user, profile) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mapScreen').style.display = 'block';
  document.getElementById('driverNameTop').textContent = user.name;
  document.getElementById('btnLogout').style.display = 'block';

  driverStatus = profile?.status || 'OFFLINE';

  initMap();
  connectSocket();
  updateDashboard();
  showStep('step-dashboard');
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

  // Trip request from dispatch
  socket.on('trip:request', (data) => {
    console.log('📦 Trip request received:', data);
    currentTripRequest = data;

    document.getElementById('reqPickup').textContent = `📍 Đón: ${data.pickupLat.toFixed(4)}, ${data.pickupLng.toFixed(4)}`;
    document.getElementById('reqDropoff').textContent = `🏁 Đến: ${data.dropoffLat.toFixed(4)}, ${data.dropoffLng.toFixed(4)}`;
    document.getElementById('reqDistance').textContent = `📏 ${data.distance} km • ${data.duration} phút`;
    document.getElementById('reqPrice').textContent = formatCurrency(calculatePrice(data.distance));

    showRequestOnMap(data);
    showStep('step-request');
    startCountdown(15);

    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e) {}
  });

  socket.on('trip:confirmed', ({ trip }) => {
    currentTrip = { ...trip, status: 'ACCEPTED' };
    currentTripRequest = null;

    document.getElementById('tripStatus').textContent = 'Đang đến điểm đón';
    document.getElementById('tripPickup').textContent = `${trip.pickup_lat.toFixed(4)}, ${trip.pickup_lng.toFixed(4)}`;
    document.getElementById('tripDropoff').textContent = `${trip.dropoff_lat.toFixed(4)}, ${trip.dropoff_lng.toFixed(4)}`;
    document.getElementById('tripPrice').textContent = formatCurrency(calculatePrice(trip.distance));

    document.getElementById('btnTripAction').textContent = '📍 Đã đến điểm đón';
    document.getElementById('btnTripAction').className = 'btn btn-action';

    if (myLocation) {
      fetchRouteAndDraw(myLocation.lat, myLocation.lng, trip.pickup_lat, trip.pickup_lng, '#ff6600');
    }

    showStep('step-trip');
  });

  socket.on('trip:restored', (trip) => {
    currentTrip = trip;
    driverStatus = 'BUSY';

    document.getElementById('tripPickup').textContent = `${trip.pickup_lat.toFixed(4)}, ${trip.pickup_lng.toFixed(4)}`;
    document.getElementById('tripDropoff').textContent = `${trip.dropoff_lat.toFixed(4)}, ${trip.dropoff_lng.toFixed(4)}`;
    document.getElementById('tripPrice').textContent = formatCurrency(calculatePrice(trip.distance));

    if (trip.status === 'ACCEPTED') {
      document.getElementById('tripStatus').textContent = 'Đang đến điểm đón';
      document.getElementById('btnTripAction').textContent = '📍 Đã đến điểm đón';
      document.getElementById('btnTripAction').className = 'btn btn-action';
    } else if (trip.status === 'ARRIVED') {
      document.getElementById('tripStatus').textContent = 'Đã đến - Chờ khách';
      document.getElementById('btnTripAction').textContent = '🚀 Bắt đầu chuyến';
      document.getElementById('btnTripAction').className = 'btn btn-action';
    } else if (trip.status === 'ON_TRIP') {
      document.getElementById('tripStatus').textContent = 'Đang trên chuyến';
      document.getElementById('btnTripAction').textContent = '🏁 Hoàn thành chuyến';
      document.getElementById('btnTripAction').className = 'btn btn-finish';
    }

    showPickupDropoffMarkers(trip.pickup_lat, trip.pickup_lng, trip.dropoff_lat, trip.dropoff_lng);
    showStep('step-trip');
    startGPSTracking();
  });

  socket.on('trip:status_updated', ({ tripId, status }) => {
    if (!currentTrip || currentTrip.id !== tripId) return;
    currentTrip.status = status;

    if (status === 'ARRIVED') {
      document.getElementById('tripStatus').textContent = 'Đã đến - Chờ khách';
      document.getElementById('btnTripAction').textContent = '🚀 Bắt đầu chuyến';
      document.getElementById('btnTripAction').className = 'btn btn-action';
    } else if (status === 'ON_TRIP') {
      document.getElementById('tripStatus').textContent = 'Đang trên chuyến';
      document.getElementById('btnTripAction').textContent = '🏁 Hoàn thành chuyến';
      document.getElementById('btnTripAction').className = 'btn btn-finish';

      if (myLocation) {
        fetchRouteAndDraw(myLocation.lat, myLocation.lng, currentTrip.dropoff_lat, currentTrip.dropoff_lng, '#0066ff');
      }
    } else if (status === 'COMPLETED') {
      document.getElementById('earnedAmount').textContent = formatCurrency(calculatePrice(currentTrip.distance));
      clearTripMarkers();
      currentTrip = null;
      driverStatus = 'ONLINE';
      showStep('step-finished');
    }
  });

  socket.on('trip:cancelled', ({ tripId }) => {
    alert('Khách hàng đã hủy chuyến.');
    clearTripMarkers();
    currentTrip = null;
    driverStatus = 'ONLINE';
    updateDashboard();
    showStep('step-dashboard');
  });
}

// ========================
// MAP INIT
// ========================
function initMap() {
  if (map) return;
  map = L.map('map', { zoomControl: false }).setView([10.7769, 106.7009], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  map.on('click', onMapClick);
}

function onMapClick(e) {
  if (currentTrip) return;

  const { lat, lng } = e.latlng;
  setMyLocation(lat, lng);

  if (driverStatus === 'ONLINE' && socket) {
    socket.emit('driver:update_location', { lat, lng });
  }
}

function setMyLocation(lat, lng) {
  myLocation = { lat, lng };

  if (!myMarker) {
    myMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: '<div style="font-size:32px;text-align:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">🚗</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: '',
      }),
    }).addTo(map);
  } else {
    myMarker.setLatLng([lat, lng]);
  }

  map.setView([lat, lng], map.getZoom());
}

// ========================
// GPS
// ========================
function startGPSTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation(pos.coords.latitude, pos.coords.longitude);
        if (socket) {
          socket.emit('driver:update_location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      () => {
        console.log('GPS not available, use map click to set location');
      },
      { enableHighAccuracy: true }
    );
  }

  locationInterval = setInterval(() => {
    if (myLocation && driverStatus !== 'OFFLINE' && socket) {
      if (currentTrip && currentTrip.status === 'ACCEPTED') {
        simulateMovement(currentTrip.pickup_lat, currentTrip.pickup_lng);
      } else if (currentTrip && currentTrip.status === 'ON_TRIP') {
        simulateMovement(currentTrip.dropoff_lat, currentTrip.dropoff_lng);
      }

      socket.emit('driver:update_location', {
        lat: myLocation.lat,
        lng: myLocation.lng,
      });
    }
  }, 3000);
}

function stopGPSTracking() {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
}

function simulateMovement(targetLat, targetLng) {
  if (!myLocation) return;
  const speed = 0.0003;
  const dlat = targetLat - myLocation.lat;
  const dlng = targetLng - myLocation.lng;
  const dist = Math.sqrt(dlat * dlat + dlng * dlng);

  if (dist < 0.0005) return;

  const ratio = speed / dist;
  const newLat = myLocation.lat + dlat * ratio;
  const newLng = myLocation.lng + dlng * ratio;

  setMyLocation(newLat, newLng);
}

// ========================
// ONLINE / OFFLINE
// ========================
function toggleOnline() {
  if (!myLocation) {
    alert('Vui lòng nhấn vào bản đồ để chọn vị trí của bạn trước!');
    return;
  }
  if (!socket) return;

  if (driverStatus === 'OFFLINE') {
    socket.emit('driver:go_online', {
      lat: myLocation.lat,
      lng: myLocation.lng,
    });
    driverStatus = 'ONLINE';
    startGPSTracking();
  } else {
    socket.emit('driver:go_offline');
    driverStatus = 'OFFLINE';
    stopGPSTracking();
  }

  updateDashboard();
}

function updateDashboard() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const btn = document.getElementById('btnToggle');

  const statusLower = driverStatus.toLowerCase();
  dot.className = 'status-dot ' + statusLower;

  if (driverStatus === 'OFFLINE') {
    text.textContent = 'Offline - Chưa nhận chuyến';
    btn.textContent = 'Bắt đầu nhận chuyến';
    btn.className = 'btn btn-online';
    btn.disabled = false;
  } else if (driverStatus === 'ONLINE') {
    text.textContent = 'Online - Đang chờ chuyến';
    btn.textContent = 'Tắt nhận chuyến';
    btn.className = 'btn btn-offline';
    btn.disabled = false;
  } else if (driverStatus === 'BUSY') {
    text.textContent = 'Đang có chuyến';
    btn.textContent = 'Đang bận';
    btn.className = 'btn';
    btn.disabled = true;
  }
}

// ========================
// TRIP REQUEST HANDLING
// ========================
function startCountdown(seconds) {
  let remaining = seconds;
  document.getElementById('countdown').textContent = remaining;

  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    remaining--;
    document.getElementById('countdown').textContent = remaining;

    if (remaining <= 0) {
      clearInterval(countdownTimer);
      if (currentTripRequest) {
        rejectTrip();
      }
    }
  }, 1000);
}

function acceptTrip() {
  if (!currentTripRequest || !socket) return;
  if (countdownTimer) clearInterval(countdownTimer);

  socket.emit('driver:accept_trip', {
    tripId: currentTripRequest.tripId,
  });

  driverStatus = 'BUSY';
}

function rejectTrip() {
  if (!currentTripRequest || !socket) return;
  if (countdownTimer) clearInterval(countdownTimer);

  socket.emit('driver:reject_trip', {
    tripId: currentTripRequest.tripId,
  });

  currentTripRequest = null;
  clearTripMarkers();
  showStep('step-dashboard');
}

// ========================
// TRIP ACTIONS
// ========================
function tripAction() {
  if (!currentTrip || !socket) return;

  if (currentTrip.status === 'ACCEPTED') {
    socket.emit('driver:arrived', { tripId: currentTrip.id });
  } else if (currentTrip.status === 'ARRIVED') {
    socket.emit('driver:start_trip', { tripId: currentTrip.id });
  } else if (currentTrip.status === 'ON_TRIP') {
    socket.emit('driver:finish_trip', { tripId: currentTrip.id });
  }
}

function backToDashboard() {
  driverStatus = 'ONLINE';
  updateDashboard();
  showStep('step-dashboard');
}

// ========================
// MAP HELPERS
// ========================
function showRequestOnMap(data) {
  clearTripMarkers();

  pickupMarker = L.marker([data.pickupLat, data.pickupLng], {
    icon: L.divIcon({
      html: '<div style="font-size:28px;text-align:center">📍</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      className: '',
    }),
  }).addTo(map).bindPopup('Điểm đón');

  dropoffMarker = L.marker([data.dropoffLat, data.dropoffLng], {
    icon: L.divIcon({
      html: '<div style="font-size:28px;text-align:center">🏁</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      className: '',
    }),
  }).addTo(map).bindPopup('Điểm đến');

  const bounds = L.latLngBounds(
    [data.pickupLat, data.pickupLng],
    [data.dropoffLat, data.dropoffLng]
  );
  if (myLocation) {
    bounds.extend([myLocation.lat, myLocation.lng]);
  }
  map.fitBounds(bounds, { padding: [60, 120] });
}

function showPickupDropoffMarkers(pLat, pLng, dLat, dLng) {
  clearTripMarkers();

  pickupMarker = L.marker([pLat, pLng], {
    icon: L.divIcon({
      html: '<div style="font-size:28px;text-align:center">📍</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      className: '',
    }),
  }).addTo(map);

  dropoffMarker = L.marker([dLat, dLng], {
    icon: L.divIcon({
      html: '<div style="font-size:28px;text-align:center">🏁</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      className: '',
    }),
  }).addTo(map);
}

function clearTripMarkers() {
  if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
  if (dropoffMarker) { map.removeLayer(dropoffMarker); dropoffMarker = null; }
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
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

function calculatePrice(distanceKm) {
  const baseFare = 12000;
  const perKm = 8500;
  return Math.round((baseFare + distanceKm * perKm) / 1000) * 1000;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// ========================
// UI HELPERS
// ========================
function showStep(stepId) {
  ['step-select', 'step-dashboard', 'step-request', 'step-trip', 'step-finished'].forEach(id => {
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
  toggleOnline,
  acceptTrip,
  rejectTrip,
  tripAction,
  backToDashboard,
};

// ========================
// INIT - check existing session
// ========================
if (isLoggedIn()) {
  const user = getUser();
  if (user && user.role === 'DRIVER') {
    // Fetch profile from API
    apiFetch('/api/auth/me').then(res => res.json()).then(json => {
      if (json.success && json.data) {
        const { user, role, profile } = json.data;
        onAuthSuccess({ ...user, role }, profile);
      } else {
        clearAuth();
      }
    }).catch(() => clearAuth());
  } else {
    clearAuth();
  }
}
