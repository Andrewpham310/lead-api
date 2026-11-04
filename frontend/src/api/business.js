import { apiRequest } from './client';

export function createBusiness(token, profile) {
  return apiRequest('/api/business', {
    method: 'POST',
    token,
    body: profile,
  });
}

export function getMyBusiness(token) {
  return apiRequest('/api/business/me', { token });
}

export function updateMyBusiness(token, profile) {
  return apiRequest('/api/business/me', {
    method: 'PATCH',
    token,
    body: profile,
  });
}

export function regenerateApiKey(token) {
  return apiRequest('/api/business/regenerate-api-key', {
    method: 'POST',
    token,
  });
}
