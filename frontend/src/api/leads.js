import { apiRequest } from './client';

export function submitLeadPublic(
  apiKey,
  { name, phone, email, message, source, companyUrl, turnstileToken }
) {
  return apiRequest('/api/leads', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: {
      name,
      phone,
      email,
      message,
      source: source || 'website',
      // Honeypot: always empty for real visitors.
      company_url: companyUrl || '',
      ...(turnstileToken ? { turnstileToken } : {}),
    },
  });
}

export function getLeads(token) {
  return apiRequest('/api/leads', { token });
}

export function getLeadById(token, id) {
  return apiRequest(`/api/leads/${id}`, { token });
}

export function updateLeadStatus(token, id, status) {
  return apiRequest(`/api/leads/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export function deleteLead(token, id) {
  return apiRequest(`/api/leads/${id}`, {
    method: 'DELETE',
    token,
  });
}