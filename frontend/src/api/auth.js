import { apiRequest } from './client';

export function register({ name, email, password }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function login({ email, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function exchangeGoogleCode(code) {
  return apiRequest('/api/auth/google/exchange', {
    method: 'POST',
    body: { code },
  });
}

export function getMe(token) {
  return apiRequest('/api/auth/me', { token });
}

export function logoutAllSessions(token) {
  return apiRequest('/api/auth/logout-all', {
    method: 'POST',
    token,
  });
}

export function changePassword(token, { currentPassword, newPassword }) {
  return apiRequest('/api/auth/password', {
    method: 'PATCH',
    token,
    body: currentPassword ? { currentPassword, newPassword } : { newPassword },
  });
}