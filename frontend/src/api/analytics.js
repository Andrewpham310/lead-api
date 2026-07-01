import { apiRequest } from './client';

export function getAnalyticsSummary(token) {
  return apiRequest('/api/analytics/summary', { token });
}
