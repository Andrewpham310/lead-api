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

export function getMe(token) {
  return apiRequest('/api/auth/me', { token });
}
