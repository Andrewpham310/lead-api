import { apiRequest } from './client';

export function submitLeadPublic(apiKey, { name, phone, email, message, source }) {
  return apiRequest('/api/leads', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { name, phone, email, message, source: source || 'website' },
  });
}

export function createLeadAsOwner(token, { name, phone, email, message, source }) {
  return apiRequest('/api/leads/owner', {
    method: 'POST',
    token,
    body: { name, phone, email, message, source },
  });
}

export function getLeads(token) {
  return apiRequest('/api/leads', { token });
}

export function getLeadById(token, id) {
  return apiRequest(`/api/leads/${id}`, { token });
}

export function updateLead(token, id, data) {
  return apiRequest(`/api/leads/${id}`, {
    method: 'PATCH',
    token,
    body: data,
  });
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

export function addNote(token, leadId, text, updateLastContacted = false) {
  return apiRequest(`/api/leads/${leadId}/notes`, {
    method: 'POST',
    token,
    body: { text, updateLastContacted },
  });
}

export function deleteNote(token, leadId, noteId) {
  return apiRequest(`/api/leads/${leadId}/notes/${noteId}`, {
    method: 'DELETE',
    token,
  });
}
