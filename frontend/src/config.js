// Backend API and WebSocket URL
// Change this when deploying or running backend on a different host/port
export const API_BASE_URL = 'http://localhost:3000';
export const SOCKET_URL = 'http://localhost:3000';

// ========================
// AUTH HELPERS
// ========================
const TOKEN_KEY = 'hpkgo_token';
const USER_KEY = 'hpkgo_user';

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

/**
 * Fetch wrapper that auto-attaches Bearer token
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    window.location.reload();
    throw new Error('Session expired');
  }
  return res;
}
