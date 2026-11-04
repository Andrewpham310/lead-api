import { apiRequest } from './client';

export function startGoogleBusinessConnect(token) {
  return apiRequest('/api/google/business/connect', { token });
}

export function getGoogleBusinessStatus(token) {
  return apiRequest('/api/google/business/status', { token });
}

export function getGoogleBusinessLocations(token) {
  return apiRequest('/api/google/business/locations', { token });
}

export function selectGoogleBusinessLocation(token, { accountId, locationId }) {
  return apiRequest('/api/google/business/location', {
    method: 'POST',
    token,
    body: { accountId, locationId },
  });
}

export function disconnectGoogleBusiness(token) {
  return apiRequest('/api/google/business', {
    method: 'DELETE',
    token,
  });
}

export function importGoogleBusiness(token) {
  return apiRequest('/api/google/business/import', {
    method: 'POST',
    token,
  });
}
