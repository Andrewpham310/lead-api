/**
 * End-to-end API flow test (mirrors the Postman test sequence).
 * Uses an in-memory MongoDB — no local MongoDB install required.
 *
 * Run: npm run test:flow
 */

require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('../src/config/db');
const app = require('../src/server');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (baseUrl, method, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  return { status: response.status, data };
};

const run = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.NODE_ENV = 'test';

  await connectDB();

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('Running API test flow...\n');

  // 1. Health check
  const health = await request(baseUrl, 'GET', '/api/health');
  assert(health.status === 200, 'Health check failed');
  assert(health.data.status === 'ok', 'Health status not ok');
  console.log('✓ GET /api/health');

  // 2. Register
  const register = await request(baseUrl, 'POST', '/api/auth/register', {
    body: {
      name: 'Andrew',
      email: 'andrew@example.com',
      password: 'password123',
    },
  });
  assert(register.status === 201, 'Register failed');
  assert(register.data.token, 'Register did not return token');
  console.log('✓ POST /api/auth/register');

  const token = register.data.token;

  // 3. Login
  const login = await request(baseUrl, 'POST', '/api/auth/login', {
    body: {
      email: 'andrew@example.com',
      password: 'password123',
    },
  });
  assert(login.status === 200, 'Login failed');
  assert(login.data.user.email === 'andrew@example.com', 'Login user mismatch');
  console.log('✓ POST /api/auth/login');

  // 4. Get me
  const me = await request(baseUrl, 'GET', '/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(me.status === 200, 'Get me failed');
  console.log('✓ GET /api/auth/me');

  // 5. Create business
  const business = await request(baseUrl, 'POST', '/api/business', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      businessName: 'Anna Nails',
      industry: 'nail salon',
    },
  });
  assert(business.status === 201, 'Create business failed');
  assert(business.data.apiKey.startsWith('nw_live_'), 'Invalid API key format');
  console.log('✓ POST /api/business');

  const apiKey = business.data.apiKey;

  // 6. Submit lead (public)
  const submitLead = await request(baseUrl, 'POST', '/api/leads', {
    headers: { 'x-api-key': apiKey },
    body: {
      name: 'John Smith',
      phone: '4161234567',
      email: 'john@example.com',
      message: 'I want to book a manicure this Friday',
      source: 'website',
    },
  });
  assert(submitLead.status === 201, 'Submit lead failed');
  assert(submitLead.data.success === true, 'Lead submit success flag missing');
  console.log('✓ POST /api/leads (public)');

  // 7. Invalid API key
  const invalidKey = await request(baseUrl, 'POST', '/api/leads', {
    headers: { 'x-api-key': 'nw_live_invalid' },
    body: {
      name: 'Test',
      message: 'Test message',
    },
  });
  assert(invalidKey.status === 401, 'Invalid API key should return 401');
  console.log('✓ POST /api/leads with invalid API key (401)');

  // 8. List leads
  const leads = await request(baseUrl, 'GET', '/api/leads', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(leads.status === 200, 'Get leads failed');
  assert(Array.isArray(leads.data) && leads.data.length === 1, 'Expected 1 lead');
  console.log('✓ GET /api/leads');

  const leadId = leads.data[0]._id;

  // 9. Get single lead
  const singleLead = await request(baseUrl, 'GET', `/api/leads/${leadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(singleLead.status === 200, 'Get lead by id failed');
  console.log('✓ GET /api/leads/:id');

  // 10. Update status
  const updateStatus = await request(
    baseUrl,
    'PATCH',
    `/api/leads/${leadId}/status`,
    {
      headers: { Authorization: `Bearer ${token}` },
      body: { status: 'contacted' },
    }
  );
  assert(updateStatus.status === 200, 'Update status failed');
  assert(updateStatus.data.status === 'contacted', 'Status not updated');
  console.log('✓ PATCH /api/leads/:id/status');

  // 11. Analytics
  const analytics = await request(baseUrl, 'GET', '/api/analytics/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(analytics.status === 200, 'Analytics failed');
  assert(analytics.data.totalLeads === 1, 'totalLeads should be 1');
  assert(analytics.data.contactedLeads === 1, 'contactedLeads should be 1');
  assert(analytics.data.usageThisMonth === 1, 'usageThisMonth should be 1');
  console.log('✓ GET /api/analytics/summary');

  // 12. Create lead as owner (manual entry)
  const createOwnerLead = await request(baseUrl, 'POST', '/api/leads/owner', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: 'Jane Doe',
      phone: '4169876543',
      email: 'jane@example.com',
      source: 'instagram',
    },
  });
  assert(createOwnerLead.status === 201, 'Create owner lead failed');
  console.log('✓ POST /api/leads/owner (manual entry)');

  const ownerLeadId = createOwnerLead.data._id;

  // 13. Verify manual lead doesn't count toward API usage
  const analyticsAfterManual = await request(
    baseUrl,
    'GET',
    '/api/analytics/summary',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(
    analyticsAfterManual.data.usageThisMonth === 1,
    'Manual lead should not count toward API usage'
  );
  console.log('✓ Manual lead does not count toward API usage');

  // 14. Update lead details
  const updateLeadDetails = await request(baseUrl, 'PATCH', `/api/leads/${ownerLeadId}`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: 'Jane Smith',
      phone: '4169999999',
      status: 'contacted',
    },
  });
  assert(updateLeadDetails.status === 200, 'Update lead failed');
  assert(updateLeadDetails.data.name === 'Jane Smith', 'Name not updated');
  assert(updateLeadDetails.data.status === 'contacted', 'Status not updated');
  console.log('✓ PATCH /api/leads/:id (update details)');

  // 15. Add follow-up note
  const addNote = await request(baseUrl, 'POST', `/api/leads/${ownerLeadId}/notes`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      text: 'Called, left voicemail',
      updateLastContacted: true,
    },
  });
  assert(addNote.status === 201, 'Add note failed');
  assert(addNote.data.followUpNotes.length === 1, 'Note not added');
  assert(addNote.data.lastContactedAt, 'lastContactedAt not set');
  console.log('✓ POST /api/leads/:id/notes');

  const noteId = addNote.data.followUpNotes[0]._id;

  // 16. Add another note
  const addNote2 = await request(baseUrl, 'POST', `/api/leads/${ownerLeadId}/notes`, {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      text: 'Followed up via email',
      updateLastContacted: false,
    },
  });
  assert(addNote2.status === 201, 'Add second note failed');
  assert(addNote2.data.followUpNotes.length === 2, 'Second note not added');
  console.log('✓ POST /api/leads/:id/notes (second note)');

  // 17. Delete a note
  const deleteNote = await request(
    baseUrl,
    'DELETE',
    `/api/leads/${ownerLeadId}/notes/${noteId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(deleteNote.status === 200, 'Delete note failed');
  assert(deleteNote.data.followUpNotes.length === 1, 'Note not deleted');
  console.log('✓ DELETE /api/leads/:id/notes/:noteId');

  // 18. Cross-business access test (register second user)
  const register2 = await request(baseUrl, 'POST', '/api/auth/register', {
    body: {
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password456',
    },
  });
  assert(register2.status === 201, 'Second register failed');
  const token2 = register2.data.token;

  const business2 = await request(baseUrl, 'POST', '/api/business', {
    headers: { Authorization: `Bearer ${token2}` },
    body: {
      businessName: 'Bob Shop',
      industry: 'retail',
    },
  });
  assert(business2.status === 201, 'Second business failed');
  console.log('✓ Created second business for cross-business test');

  // 19. Try to access another business's lead
  const crossAccess = await request(baseUrl, 'GET', `/api/leads/${ownerLeadId}`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  assert(crossAccess.status === 404, 'Cross-business access should return 404');
  console.log('✓ Cross-business access correctly rejected (404)');

  // 20. Try to update another business's lead
  const crossUpdate = await request(baseUrl, 'PATCH', `/api/leads/${ownerLeadId}`, {
    headers: { Authorization: `Bearer ${token2}` },
    body: { name: 'Hacked' },
  });
  assert(crossUpdate.status === 404, 'Cross-business update should return 404');
  console.log('✓ Cross-business update correctly rejected (404)');

  // 21. Try to add note to another business's lead
  const crossNote = await request(baseUrl, 'POST', `/api/leads/${ownerLeadId}/notes`, {
    headers: { Authorization: `Bearer ${token2}` },
    body: { text: 'Hacked note' },
  });
  assert(crossNote.status === 404, 'Cross-business note should return 404');
  console.log('✓ Cross-business note correctly rejected (404)');

  // 22. Delete original lead
  const deleteLead = await request(baseUrl, 'DELETE', `/api/leads/${leadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(deleteLead.status === 200, 'Delete lead failed');
  console.log('✓ DELETE /api/leads/:id');

  console.log('\nAll tests passed.');

  server.close();
  await mongod.stop();
  process.exit(0);
};

run().catch((error) => {
  console.error('\nTest flow failed:', error.message);
  process.exit(1);
});
