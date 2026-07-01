import { apiRequest } from './client';

export function createBusiness(token, { businessName, industry }) {
  return apiRequest('/api/business', {
    method: 'POST',
    token,
    body: { businessName, industry },
  });
}

export function getMyBusiness(token) {
  return apiRequest('/api/business/me', { token });
}

export function updateMyBusiness(token, { businessName, industry }) {
  return apiRequest('/api/business/me', {
    method: 'PATCH',
    token,
    body: { businessName, industry },
  });
}

export function regenerateApiKey(token) {
  return apiRequest('/api/business/regenerate-api-key', {
    method: 'POST',
    token,
  });
}
