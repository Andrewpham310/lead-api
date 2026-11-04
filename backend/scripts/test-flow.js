/**
 * End-to-end API flow test (mirrors the Postman test sequence).
 * Uses an in-memory MongoDB — no local MongoDB install required.
 *
 * Run: npm run test:flow
 */

require('dotenv').config();

const crypto = require('crypto');

// Tests never use the real .env secrets or limits.
const randomSecret = () => crypto.randomBytes(48).toString('base64url');
process.env.JWT_SECRET = randomSecret();
process.env.OAUTH_STATE_SECRET = randomSecret();
process.env.TOKEN_ENCRYPTION_KEY = randomSecret();
delete process.env.JWT_EXPIRES_IN;
delete process.env.TURNSTILE_SECRET_KEY;
delete process.env.TRUST_PROXY;
process.env.RATE_LIMIT_MAX = '1000';
process.env.LEAD_IP_RATE_LIMIT_MAX = '1000';
process.env.LEAD_KEY_RATE_LIMIT_MAX = '12';
process.env.AUTH_RATE_LIMIT_MAX = '10';

// Fail the run if express-rate-limit reports a misconfiguration (e.g. trust proxy).
const rateLimitWarnings = [];
for (const method of ['warn', 'error']) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    const text = args.map((arg) => (arg && arg.code) || String(arg)).join(' ');
    if (/ERR_ERL_/.test(text)) {
      rateLimitWarnings.push(text);
    }
    original(...args);
  };
}

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
  assert(me.data.authProvider === 'local', 'Expected local auth provider');
  console.log('✓ GET /api/auth/me');

  // 5. Create business
  const business = await request(baseUrl, 'POST', '/api/business', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      businessName: 'Anna Nails',
      industry: 'nail salon',
      address: '123 Queen St, Toronto',
      phone: '(416) 555-0199',
      website: 'annanails.example',
      serviceCatalog: [
        { name: 'Manicure', price: '$45', description: 'Classic manicure' },
        { name: '', price: '', description: '' },
      ],
      businessHours: [
        { day: 'Monday', open: '09:00', close: '17:00', closed: false },
        { day: 'Sunday', closed: true },
      ],
    },
  });
  assert(business.status === 201, 'Create business failed');
  assert(business.data.apiKey.startsWith('nw_live_'), 'Invalid API key format');
  assert(business.data.address === '123 Queen St, Toronto', 'Address was not saved');
  assert(business.data.phone === '(416) 555-0199', 'Phone was not saved');
  assert(business.data.website === 'https://annanails.example', 'Website was not normalized');
  assert(business.data.serviceCatalog.length === 1, 'Blank services should be dropped');
  assert(business.data.serviceCatalog[0].name === 'Manicure', 'Service name was not saved');
  assert(business.data.serviceCatalog[0].price === '$45', 'Service price was not saved');
  const monday = business.data.businessHours.find((period) => period.day === 'Monday');
  const sunday = business.data.businessHours.find((period) => period.day === 'Sunday');
  const tuesday = business.data.businessHours.find((period) => period.day === 'Tuesday');
  assert(monday?.open === '09:00' && monday?.close === '17:00', 'Monday hours were not saved');
  assert(sunday?.closed === true && sunday.open === '', 'Sunday should be closed');
  assert(tuesday?.closed === false && tuesday.open === '', 'Unset days should stay blank');
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

  // 12. Delete lead
  const deleteLead = await request(baseUrl, 'DELETE', `/api/leads/${leadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(deleteLead.status === 200, 'Delete lead failed');
  console.log('✓ DELETE /api/leads/:id');

  // 13. Google-only accounts cannot use a password
  const User = require('../src/models/User');
  await User.create({
    name: 'Google Only',
    email: 'google-only@example.com',
    googleId: 'google-sub-1',
    authProvider: 'google',
  });
  const googleLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: {
      email: 'google-only@example.com',
      password: 'password123',
    },
  });
  assert(googleLogin.status === 401, 'Google-only login should return 401');
  assert(
    googleLogin.data.message === 'Invalid email or password',
    'Google-only login should return the generic invalid-credentials message'
  );
  console.log('✓ POST /api/auth/login rejects Google-only accounts');

  process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'test-encryption-key';
  const { encrypt, decrypt } = require('../src/utils/tokenCrypto');
  assert(decrypt(encrypt('refresh-token-value')) === 'refresh-token-value', 'Token encryption failed');
  console.log('✓ Google token encryption roundtrip');

  const { toProfileSnapshot } = require('../src/utils/googleBusinessApi');
  const snapshot = toProfileSnapshot({
    title: 'Anna Nails',
    categories: { primaryCategory: { displayName: 'Nail salon' } },
    storefrontAddress: {
      addressLines: ['123 Main'],
      locality: 'Toronto',
      administrativeArea: 'ON',
      postalCode: 'M5V',
    },
    phoneNumbers: { primaryPhone: '4161234567' },
    websiteUri: 'https://example.com',
    regularHours: {
      periods: [
        {
          openDay: 'MONDAY',
          openTime: { hours: 9, minutes: 0 },
          closeTime: { hours: 17, minutes: 30 },
        },
      ],
    },
    metadata: { mapsUri: 'https://maps.example' },
  });
  assert(snapshot.name === 'Anna Nails', 'Snapshot name');
  assert(snapshot.address === '123 Main, Toronto, ON, M5V', 'Snapshot address');
  assert(snapshot.hours[0].open === '9:00 AM', 'Snapshot open time');
  assert(snapshot.hours[0].close === '5:30 PM', 'Snapshot close time');
  console.log('✓ Google location snapshot');

  const googleStatus = await request(baseUrl, 'GET', '/api/google/business/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(googleStatus.status === 200, 'Google status failed');
  assert(googleStatus.data.connected === false, 'Expected no Google connection');
  console.log('✓ GET /api/google/business/status');

  const importMissing = await request(baseUrl, 'POST', '/api/google/business/import', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(importMissing.status === 400, 'Import without a connection should return 400');
  console.log('✓ POST /api/google/business/import without a connection (400)');

  const googleStart = await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' });
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    assert(googleStart.status === 302, 'Google sign-in should redirect');
    const location = googleStart.headers.get('location') || '';
    assert(location.includes('accounts.google.com'), 'Google sign-in should go to Google');
  } else {
    assert(googleStart.status === 500, 'Unconfigured Google sign-in should return 500');
  }
  console.log('✓ GET /api/auth/google');

  // --- Google OAuth hardening ---
  const { signOAuthState, verifyOAuthState } = require('../src/utils/oauthState');
  const { hashNonce, nonceMatchesState } = require('../src/utils/oauthNonce');
  const { issueOneTimeCode } = require('../src/utils/oneTimeCode');
  const { findOrCreateGoogleUser } = require('../src/utils/googleUser');
  const generateToken = require('../src/utils/generateToken');
  const GoogleConnection = require('../src/models/GoogleConnection');
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const getRedirect = (path, cookie) =>
    fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
      headers: cookie ? { Cookie: cookie } : {},
    });
  const postStart = (body) =>
    fetch(`${baseUrl}/api/google/business/start`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
  const findSetCookie = (response, name) =>
    response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`));
  const cookieValue = (setCookie) => setCookie.split(';')[0].split('=').slice(1).join('=');

  if (googleConfigured) {
    const signinCookie = findSetCookie(googleStart, 'g_signin_nonce');
    assert(signinCookie, 'Google sign-in start should set a nonce cookie');
    assert(/HttpOnly/i.test(signinCookie), 'Nonce cookie should be HttpOnly');
    assert(/SameSite=Lax/i.test(signinCookie), 'Nonce cookie should be SameSite=Lax');
    assert(/Path=\/api\/auth\/google\/callback/i.test(signinCookie), 'Nonce cookie should be scoped to the callback');
    const startState = new URL(googleStart.headers.get('location')).searchParams.get('state');
    assert(
      nonceMatchesState(cookieValue(signinCookie), verifyOAuthState(startState).nonce),
      'Sign-in state should carry the cookie nonce hash'
    );
    console.log('✓ GET /api/auth/google sets a browser-bound nonce cookie');
  }

  assert(nonceMatchesState('nonce-a', hashNonce('nonce-a')), 'Matching nonce should pass');
  assert(!nonceMatchesState('nonce-b', hashNonce('nonce-a')), 'Different nonce should fail');
  assert(!nonceMatchesState(null, hashNonce('nonce-a')), 'Missing cookie should fail');
  assert(!nonceMatchesState('nonce-a', undefined), 'State without nonce should fail');
  console.log('✓ OAuth nonce comparison');

  const signinState = encodeURIComponent(
    signOAuthState({ purpose: 'google_signin', nonce: hashNonce('browser-a-nonce') })
  );
  for (const cookie of [undefined, 'g_signin_nonce=attacker-nonce']) {
    const response = await getRedirect(`/api/auth/google/callback?code=fake-code&state=${signinState}`, cookie);
    assert(response.status === 302, 'Sign-in callback should redirect');
    const location = new URL(response.headers.get('location'));
    assert(location.pathname === '/login', 'Sign-in callback without matching cookie should go to /login');
    const errorCode = location.searchParams.get('error');
    assert(errorCode && /^[a-z0-9_]+$/.test(errorCode), 'Sign-in callback should report an error code');
    assert(!location.searchParams.has('code') && !location.searchParams.has('token'), 'No login code on failure');
    assert(/^g_signin_nonce=;/.test(findSetCookie(response, 'g_signin_nonce') || ''), 'Callback should clear the nonce cookie');
  }
  console.log('✓ Google sign-in callback rejects state without the matching browser cookie');

  const andrewUser = await User.findOne({ email: 'andrew@example.com' });
  const businessState = encodeURIComponent(
    signOAuthState({
      purpose: 'google_business',
      userId: String(andrewUser._id),
      nonce: hashNonce('browser-a-nonce'),
    })
  );
  for (const cookie of [undefined, 'g_business_nonce=attacker-nonce']) {
    const response = await getRedirect(`/api/google/business/callback?code=fake-code&state=${businessState}`, cookie);
    assert(response.status === 302, 'Business callback should redirect');
    const location = new URL(response.headers.get('location'));
    assert(location.pathname === '/business', 'Business callback should go to /business');
    assert(location.searchParams.get('google') === 'error', 'Business callback without matching cookie should fail');
    const reason = location.searchParams.get('reason');
    assert(reason && /^[a-z0-9_]+$/.test(reason), 'Business callback should report an error code');
    assert(!location.searchParams.has('message'), 'Business callback should not put error text in the URL');
  }
  assert((await GoogleConnection.countDocuments({ userId: andrewUser._id })) === 0, 'No Google connection should be stored');
  console.log('✓ Google Business callback rejects state without the matching browser cookie');

  const bogusStart = await postStart({ ticket: 'not-a-real-ticket' });
  assert(bogusStart.status === 302, 'Business start with a bad ticket should redirect');
  assert(
    new URL(bogusStart.headers.get('location')).searchParams.get('google') === 'error',
    'Business start with a bad ticket should report an error'
  );
  assert(!findSetCookie(bogusStart, 'g_business_nonce'), 'Bad ticket should not set a nonce cookie');

  const connectStart = await request(baseUrl, 'GET', '/api/google/business/connect', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (googleConfigured) {
    assert(connectStart.status === 200, 'Business connect should return a start URL');
    const startUrl = new URL(connectStart.data.url);
    assert(startUrl.pathname === '/api/google/business/start', 'Connect should point at the backend start endpoint');
    assert(!startUrl.searchParams.has('ticket'), 'Start URL should not carry the ticket');
    const ticket = connectStart.data.ticket;
    assert(ticket, 'Connect should return a ticket in the body');

    const leaked = await getRedirect(`/api/google/business/start?ticket=${encodeURIComponent(ticket)}`);
    assert(leaked.status === 405, 'A ticket in the URL should not start the flow');
    assert(!findSetCookie(leaked, 'g_business_nonce'), 'A ticket in the URL should not set a nonce cookie');

    const started = await postStart({ ticket });
    assert(started.status === 302, 'Business start should redirect');
    const googleUrl = new URL(started.headers.get('location'));
    assert(googleUrl.hostname === 'accounts.google.com', 'Business start should go to Google');
    const businessCookie = findSetCookie(started, 'g_business_nonce');
    assert(businessCookie && /HttpOnly/i.test(businessCookie), 'Business start should set an HttpOnly nonce cookie');
    assert(/Path=\/api\/google\/business\/callback/i.test(businessCookie), 'Business nonce cookie should be scoped to the callback');
    const startedState = verifyOAuthState(googleUrl.searchParams.get('state'));
    assert(startedState.userId === String(andrewUser._id), 'Business state should carry the ticket user');
    assert(nonceMatchesState(cookieValue(businessCookie), startedState.nonce), 'Business state should carry the cookie nonce hash');

    const reused = await postStart({ ticket });
    assert(
      new URL(reused.headers.get('location')).searchParams.get('google') === 'error',
      'Business start ticket should be single-use'
    );
  } else {
    assert(connectStart.status === 500, 'Unconfigured Business connect should return 500');
  }
  console.log('✓ Google Business start ticket is single-use, stays out of the URL, and sets a browser-bound nonce cookie');

  const loginCode = await issueOneTimeCode({ purpose: 'google_login', userId: andrewUser._id });
  const exchanged = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: { code: loginCode } });
  assert(exchanged.status === 200, 'Google code exchange failed');
  assert(exchanged.data.token, 'Google code exchange did not return a token');
  assert(exchanged.data.user.email === 'andrew@example.com', 'Google code exchange user mismatch');
  const exchangedMe = await request(baseUrl, 'GET', '/api/auth/me', {
    headers: { Authorization: `Bearer ${exchanged.data.token}` },
  });
  assert(exchangedMe.status === 200, 'Exchanged token should work');
  console.log('✓ POST /api/auth/google/exchange returns a token');

  const reusedCode = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: { code: loginCode } });
  assert(reusedCode.status === 401, 'Reused login code should return 401');
  const invalidCode = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: { code: 'not-a-real-code' } });
  assert(invalidCode.status === 401, 'Invalid login code should return 401');
  const missingCode = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: {} });
  assert(missingCode.status === 400, 'Missing login code should return 400');
  const expiredCode = await issueOneTimeCode({ purpose: 'google_login', userId: andrewUser._id, ttlSeconds: -1 });
  const expired = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: { code: expiredCode } });
  assert(expired.status === 401, 'Expired login code should return 401');
  const startTicket = await issueOneTimeCode({ purpose: 'google_business_start', userId: andrewUser._id });
  const wrongPurpose = await request(baseUrl, 'POST', '/api/auth/google/exchange', { body: { code: startTicket } });
  assert(wrongPurpose.status === 401, 'A Business start ticket should not work as a login code');
  console.log('✓ POST /api/auth/google/exchange rejects reused, invalid, expired, and wrong-purpose codes');

  const preRegistered = await request(baseUrl, 'POST', '/api/auth/register', {
    body: { name: 'Squatter', email: 'victim@example.com', password: 'attacker-pass' },
  });
  assert(preRegistered.status === 201, 'Pre-registration failed');
  const squatterToken = preRegistered.data.token;
  const squatterMe = await request(baseUrl, 'GET', '/api/auth/me', {
    headers: { Authorization: `Bearer ${squatterToken}` },
  });
  assert(squatterMe.status === 200, 'Pre-registered token should work before linking');

  const linked = await findOrCreateGoogleUser({ sub: 'google-sub-victim', email: 'Victim@Example.com', name: 'Victim' });
  const linkedDoc = await User.findById(linked._id);
  assert(linkedDoc.googleId === 'google-sub-victim', 'Linking should set googleId');
  assert(!linkedDoc.password, 'Linking should clear the pre-existing password');
  assert(linkedDoc.authProvider === 'google', 'Linking should switch authProvider to google');
  assert(linkedDoc.tokenVersion === 1, 'Linking should bump tokenVersion');

  const squatterAfter = await request(baseUrl, 'GET', '/api/auth/me', {
    headers: { Authorization: `Bearer ${squatterToken}` },
  });
  assert(squatterAfter.status === 401, 'Old JWT should be rejected after linking');
  const squatterLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: 'victim@example.com', password: 'attacker-pass' },
  });
  assert(squatterLogin.status === 401, 'Old password should not work after linking');
  assert(squatterLogin.data.message === 'Invalid email or password', 'Expected the generic login message');
  const ownerMe = await request(baseUrl, 'GET', '/api/auth/me', {
    headers: { Authorization: `Bearer ${generateToken(linkedDoc)}` },
  });
  assert(ownerMe.status === 200, 'Token issued after linking should work');
  console.log('✓ Google linking clears the password and revokes old JWTs');

  const again = await findOrCreateGoogleUser({ sub: 'google-sub-victim', email: 'victim@example.com' });
  assert(String(again._id) === String(linked._id) && again.tokenVersion === 1, 'Repeat Google login should not relink');
  let conflict;
  try {
    await findOrCreateGoogleUser({ sub: 'google-sub-other', email: 'victim@example.com' });
  } catch (error) {
    conflict = error;
  }
  assert(conflict?.code === 'GOOGLE_ACCOUNT_CONFLICT', 'A different Google account should not take over a linked email');
  const created = await findOrCreateGoogleUser({ sub: 'google-sub-new', email: 'new-google@example.com', name: 'New' });
  assert(created.authProvider === 'google' && !created.password, 'New Google user should be passwordless');
  console.log('✓ Google find/link/create helper');

  const Business = require('../src/models/Business');
  const owner = await User.findOne({ email: 'andrew@example.com' });
  const businessDoc = await Business.findOne({ ownerId: owner._id });
  const editedName = businessDoc.businessName;
  businessDoc.googleLocationId = 'locations/1';
  businessDoc.googleProfile = snapshot;
  await businessDoc.save();

  const renamed = await request(baseUrl, 'PATCH', '/api/business/me', {
    headers: { Authorization: `Bearer ${token}` },
    body: { businessName: 'Anna Nails Studio' },
  });
  assert(renamed.status === 200, 'Rename after Google snapshot failed');
  assert(renamed.data.businessName === 'Anna Nails Studio', 'Business name was not updated');
  assert(renamed.data.googleProfile.name === editedName, 'Google snapshot name was overwritten');
  assert(renamed.data.industry === 'nail salon', 'Industry was cleared');
  assert(renamed.data.address === '123 Queen St, Toronto', 'Address was cleared on rename');
  assert(renamed.data.serviceCatalog[0].name === 'Manicure', 'Service catalog was cleared on rename');
  assert(
    renamed.data.businessHours.find((period) => period.day === 'Monday')?.open === '09:00',
    'Business hours were cleared on rename'
  );
  console.log('✓ PATCH /api/business/me keeps the Google snapshot');

  // --- Startup secret validation and proxy config (H1/H3) ---
  const { validateEnv, parseTrustProxy } = require('../src/config/env');
  const goodEnv = { JWT_SECRET: randomSecret(), OAUTH_STATE_SECRET: randomSecret() };
  assert(validateEnv(goodEnv).length === 0, 'Strong secrets should pass validation');
  const weakSecret = 'too-short-secret';
  const weakErrors = validateEnv({ ...goodEnv, JWT_SECRET: weakSecret });
  assert(weakErrors.some((e) => e.startsWith('JWT_SECRET')), 'Short JWT_SECRET should fail');
  assert(!weakErrors.join(' ').includes(weakSecret), 'Validation errors must not echo secret values');
  assert(
    validateEnv({ JWT_SECRET: goodEnv.JWT_SECRET }).some((e) => e.startsWith('OAUTH_STATE_SECRET')),
    'Missing OAUTH_STATE_SECRET should fail'
  );
  assert(
    validateEnv({ JWT_SECRET: goodEnv.JWT_SECRET, OAUTH_STATE_SECRET: goodEnv.JWT_SECRET }).length > 0,
    'Reusing JWT_SECRET as OAUTH_STATE_SECRET should fail'
  );
  assert(
    validateEnv({ ...goodEnv, JWT_SECRET: 'replace_with_64_random_bytes_and_some_more' }).length > 0,
    'Placeholder secrets should fail'
  );
  assert(
    validateEnv({ ...goodEnv, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }).some((e) =>
      e.startsWith('TOKEN_ENCRYPTION_KEY')
    ),
    'Google without TOKEN_ENCRYPTION_KEY should fail'
  );
  assert(
    validateEnv({ ...goodEnv, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', TOKEN_ENCRYPTION_KEY: randomSecret() })
      .length === 0,
    'Google with a TOKEN_ENCRYPTION_KEY should pass'
  );
  assert(parseTrustProxy(undefined) === 1 && parseTrustProxy('2') === 2, 'TRUST_PROXY hop count parsing');
  assert(parseTrustProxy('false') === false && parseTrustProxy('loopback') === 'loopback', 'TRUST_PROXY string parsing');
  assert(app.get('trust proxy') === 1, 'App should trust one proxy hop by default');
  console.log('✓ Startup secret validation and TRUST_PROXY parsing');

  // --- JWT hardening (H3/H4) ---
  const jwt = require('jsonwebtoken');
  const decodedSession = jwt.decode(token, { complete: true });
  assert(decodedSession.header.alg === 'HS256', 'Session tokens should be HS256');
  assert(decodedSession.payload.exp - decodedSession.payload.iat === 7 * 24 * 60 * 60, 'Default session should last 7 days');
  const hs512Token = jwt.sign({ id: owner._id, tv: owner.tokenVersion || 0 }, process.env.JWT_SECRET, { algorithm: 'HS512' });
  const hs512Me = await request(baseUrl, 'GET', '/api/auth/me', { headers: { Authorization: `Bearer ${hs512Token}` } });
  assert(hs512Me.status === 401, 'Tokens signed with another algorithm should be rejected');
  const unsignedToken = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
    JSON.stringify({ id: String(owner._id), tv: owner.tokenVersion || 0 })
  ).toString('base64url')}.`;
  const unsignedMe = await request(baseUrl, 'GET', '/api/auth/me', { headers: { Authorization: `Bearer ${unsignedToken}` } });
  assert(unsignedMe.status === 401, 'alg=none tokens should be rejected');
  const stateAsSession = signOAuthState({ id: String(owner._id), tv: owner.tokenVersion || 0 });
  const stateMe = await request(baseUrl, 'GET', '/api/auth/me', { headers: { Authorization: `Bearer ${stateAsSession}` } });
  assert(stateMe.status === 401, 'A token signed with the OAuth state key should not work as a session');
  let sessionAsState = null;
  try {
    sessionAsState = verifyOAuthState(token);
  } catch {
    sessionAsState = null;
  }
  assert(sessionAsState === null, 'A session JWT should not verify as OAuth state');
  console.log('✓ JWTs are HS256-only, 7-day by default, and separate from OAuth state');

  // --- Lead spam protection (H2) ---
  const Lead = require('../src/models/Lead');
  const { getCurrentMonthKey } = require('../src/controllers/businessController');
  const { isTurnstileEnabled, SITEVERIFY_URL } = require('../src/utils/turnstile');

  const createOwnerWithBusiness = async (label) => {
    const email = `${label}-${crypto.randomBytes(4).toString('hex')}@example.com`;
    const registered = await request(baseUrl, 'POST', '/api/auth/register', {
      body: { name: label, email, password: 'password123' },
    });
    assert(registered.status === 201, `Register ${label} failed`);
    const created = await request(baseUrl, 'POST', '/api/business', {
      headers: { Authorization: `Bearer ${registered.data.token}` },
      body: { businessName: `${label} Co` },
    });
    assert(created.status === 201, `Create business for ${label} failed`);
    return { email, token: registered.data.token, business: created.data };
  };
  const submitTo = (key, body, headers = {}) =>
    request(baseUrl, 'POST', '/api/leads', {
      headers: { 'x-api-key': key, ...headers },
      body: { name: 'Jane Doe', message: 'Do you have openings next week?', ...body },
    });

  const andrewBusiness = await Business.findOne({ ownerId: owner._id });
  const andrewLeadsBefore = await Lead.countDocuments({ businessId: andrewBusiness._id });
  const honeypot = await submitTo(apiKey, { name: 'Spam Bot', company_url: 'https://spam.example' });
  assert(honeypot.status === 201 && honeypot.data.success === true, 'Honeypot should look like a normal success');
  const afterHoneypot = await Business.findById(andrewBusiness._id);
  assert(
    (await Lead.countDocuments({ businessId: andrewBusiness._id })) === andrewLeadsBefore,
    'Honeypot submissions should not be stored'
  );
  assert(
    afterHoneypot.usageThisMonth === andrewBusiness.usageThisMonth && afterHoneypot.leadCount === andrewBusiness.leadCount,
    'Honeypot submissions should not count toward usage'
  );
  console.log('✓ Honeypot submissions get a fake success and are not stored or counted');

  const limited = await createOwnerWithBusiness('limit');
  await Business.updateOne({ _id: limited.business.id }, { monthlyLimit: 3 });
  const burst = await Promise.all(
    Array.from({ length: 10 }, (_, index) => submitTo(limited.business.apiKey, { name: `Burst ${index}` }))
  );
  const accepted = burst.filter((response) => response.status === 201).length;
  const overLimit = burst.filter((response) => response.status === 403).length;
  assert(accepted === 3 && overLimit === 7, `Expected 3 accepted and 7 over-limit, got ${accepted}/${overLimit}`);
  let limitedDoc = await Business.findById(limited.business.id);
  assert((await Lead.countDocuments({ businessId: limitedDoc._id })) === 3, 'Exactly 3 leads should be stored');
  assert(limitedDoc.usageThisMonth === 3 && limitedDoc.leadCount === 3, 'Usage should be exactly 3 after the burst');
  console.log('✓ Monthly limit holds under 10 concurrent submissions (3 stored, usage 3)');

  await Business.updateOne({ _id: limitedDoc._id }, { usageResetMonth: '2000-01', usageThisMonth: 3 });
  const rolledOver = await submitTo(limited.business.apiKey, { name: 'New Month' });
  assert(rolledOver.status === 201, 'First lead of a new month should be accepted');
  limitedDoc = await Business.findById(limitedDoc._id);
  assert(
    limitedDoc.usageThisMonth === 1 && limitedDoc.usageResetMonth === getCurrentMonthKey(),
    'Usage should reset at the start of a new month'
  );

  const originalLeadCreate = Lead.create;
  Lead.create = async () => {
    throw new Error('Simulated insert failure');
  };
  let failedInsert;
  try {
    failedInsert = await submitTo(limited.business.apiKey, { name: 'Insert Fails' });
  } finally {
    Lead.create = originalLeadCreate;
  }
  assert(failedInsert.status === 500, 'A failed insert should return 500');
  const afterFailure = await Business.findById(limitedDoc._id);
  assert(
    afterFailure.usageThisMonth === limitedDoc.usageThisMonth && afterFailure.leadCount === limitedDoc.leadCount,
    'A failed insert should give the reserved slot back'
  );
  console.log('✓ Monthly usage rolls over atomically and failed inserts release their slot');

  const keyLimited = await createOwnerWithBusiness('keylimit');
  const keyMax = Number(process.env.LEAD_KEY_RATE_LIMIT_MAX);
  for (let index = 0; index < keyMax; index++) {
    const response = await submitTo(keyLimited.business.apiKey, { name: `Lead ${index}` });
    assert(response.status === 201, `Submission ${index + 1} under the per-key limit should succeed`);
  }
  const overKey = await submitTo(keyLimited.business.apiKey, { name: 'One Too Many' });
  assert(overKey.status === 429, 'Submissions over the per-key limit should return 429');
  const otherBusiness = await submitTo(apiKey, { name: 'Other Business Customer' });
  assert(otherBusiness.status === 201, 'The per-key limit should not affect other businesses on the same IP');
  console.log('✓ Per-API-key lead limiter (429 after the limit, other businesses unaffected)');

  assert(!isTurnstileEnabled(), 'Turnstile should be off without TURNSTILE_SECRET_KEY');
  const noCaptcha = await submitTo(apiKey, { name: 'No Captcha Needed' });
  assert(noCaptcha.status === 201, 'Without TURNSTILE_SECRET_KEY submissions should not need a captcha');

  const realFetch = globalThis.fetch;
  const siteverifyCalls = [];
  let siteverifyMode = 'normal';
  globalThis.fetch = async (url, options) => {
    if (String(url) === SITEVERIFY_URL) {
      const params = new URLSearchParams(options.body);
      siteverifyCalls.push(params);
      if (siteverifyMode === 'down') {
        throw new Error('network down');
      }
      const success = params.get('response') === 'valid-token';
      return new Response(JSON.stringify({ success, 'error-codes': success ? [] : ['invalid-input-response'] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return realFetch(url, options);
  };
  process.env.TURNSTILE_SECRET_KEY = '2x0000000000000000000000000000000AA';
  try {
    const missingToken = await submitTo(apiKey, { name: 'Missing Token' });
    assert(missingToken.status === 403, 'A missing captcha token should be rejected');
    const badToken = await submitTo(apiKey, { name: 'Bad Token', turnstileToken: 'bad-token' });
    assert(badToken.status === 403, 'A failed captcha verification should be rejected');
    assert(
      siteverifyCalls.length === 1 && siteverifyCalls[0].get('secret') === process.env.TURNSTILE_SECRET_KEY,
      'Siteverify should be called with the server secret'
    );
    const goodToken = await submitTo(apiKey, { name: 'Good Token', turnstileToken: 'valid-token' });
    assert(goodToken.status === 201, 'A valid captcha token should be accepted');
    const headerToken = await submitTo(apiKey, { name: 'Header Token' }, { 'cf-turnstile-response': 'valid-token' });
    assert(headerToken.status === 201, 'The captcha token may also be sent as a header');
    siteverifyMode = 'down';
    const verifyDown = await submitTo(apiKey, { name: 'Verify Down', turnstileToken: 'valid-token' });
    assert(verifyDown.status === 503, 'Captcha verification outages should fail closed');
    siteverifyMode = 'normal';
    const honeypotWithCaptcha = await submitTo(apiKey, { name: 'Bot', company_url: 'x' });
    assert(honeypotWithCaptcha.status === 201, 'Honeypot hits should still get the fake success');

    const captchaOff = await request(baseUrl, 'PATCH', '/api/business/me', {
      headers: { Authorization: `Bearer ${token}` },
      body: { requireCaptcha: false },
    });
    assert(captchaOff.status === 200 && captchaOff.data.requireCaptcha === false, 'Owner should be able to turn captcha off');
    assert(captchaOff.data.captchaEnabled === true, 'Business response should report that captcha is configured');
    const serverPost = await submitTo(apiKey, { name: 'Server Integration' });
    assert(serverPost.status === 201, 'Businesses with captcha off should accept direct API submissions');
    const badFlag = await request(baseUrl, 'PATCH', '/api/business/me', {
      headers: { Authorization: `Bearer ${token}` },
      body: { requireCaptcha: 'no' },
    });
    assert(badFlag.status === 400, 'requireCaptcha must be a boolean');
    await request(baseUrl, 'PATCH', '/api/business/me', {
      headers: { Authorization: `Bearer ${token}` },
      body: { requireCaptcha: true },
    });
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
  console.log('✓ Turnstile: skipped when unset; enforced, fail-closed, and per-business when set');

  // --- Sessions: logout-all and password changes (H4) ---
  const sessionUser = await createOwnerWithBusiness('sessions');
  const secondLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: sessionUser.email, password: 'password123' },
  });
  assert(secondLogin.status === 200, 'Second-device login failed');
  const meWith = (bearer) => request(baseUrl, 'GET', '/api/auth/me', { headers: { Authorization: `Bearer ${bearer}` } });
  assert((await meWith(sessionUser.token)).status === 200 && (await meWith(secondLogin.data.token)).status === 200, 'Both sessions should work');
  const logoutAll = await request(baseUrl, 'POST', '/api/auth/logout-all', {
    headers: { Authorization: `Bearer ${sessionUser.token}` },
  });
  assert(logoutAll.status === 200, 'Logout-all failed');
  assert((await meWith(sessionUser.token)).status === 401, 'Logout-all should revoke the calling session');
  assert((await meWith(secondLogin.data.token)).status === 401, 'Logout-all should revoke other sessions');
  const reLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: sessionUser.email, password: 'password123' },
  });
  assert(reLogin.status === 200 && (await meWith(reLogin.data.token)).status === 200, 'Logging in again should work');
  const logoutAllNoAuth = await request(baseUrl, 'POST', '/api/auth/logout-all');
  assert(logoutAllNoAuth.status === 401, 'Logout-all requires a session');
  console.log('✓ POST /api/auth/logout-all revokes every existing token');

  const changePassword = (bearer, body) =>
    request(baseUrl, 'PATCH', '/api/auth/password', { headers: { Authorization: `Bearer ${bearer}` }, body });
  const pwToken = reLogin.data.token;
  const wrongCurrent = await changePassword(pwToken, { currentPassword: 'not-my-password', newPassword: 'brand-new-pass-1' });
  assert(wrongCurrent.status === 400, 'Wrong current password should be rejected');
  const missingCurrent = await changePassword(pwToken, { newPassword: 'brand-new-pass-1' });
  assert(missingCurrent.status === 400, 'Missing current password should be rejected for password accounts');
  const tooShort = await changePassword(pwToken, { currentPassword: 'password123', newPassword: 'short1' });
  assert(tooShort.status === 400, 'New passwords under 8 characters should be rejected');
  const notString = await changePassword(pwToken, { currentPassword: 'password123', newPassword: { $ne: null } });
  assert(notString.status === 400, 'Non-string new passwords should be rejected');
  assert((await meWith(pwToken)).status === 200, 'Failed attempts should not revoke the session');
  const changed = await changePassword(pwToken, { currentPassword: 'password123', newPassword: 'brand-new-pass-1' });
  assert(changed.status === 200 && changed.data.token, 'Password change should succeed and return a fresh token');
  assert((await meWith(pwToken)).status === 401, 'Old token should be rejected after a password change');
  assert((await meWith(changed.data.token)).status === 200, 'Fresh token should work after a password change');
  const oldPasswordLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: sessionUser.email, password: 'password123' },
  });
  assert(oldPasswordLogin.status === 401, 'Old password should no longer work');
  const newPasswordLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: sessionUser.email, password: 'brand-new-pass-1' },
  });
  assert(newPasswordLogin.status === 200, 'New password should work');
  console.log('✓ PATCH /api/auth/password (wrong/missing current rejected, old tokens revoked, new password works)');

  const googleOnly = await User.create({
    name: 'Google Setter',
    email: 'google-setter@example.com',
    googleId: 'google-sub-setter',
    authProvider: 'google',
  });
  const googleToken = generateToken(googleOnly);
  const googleMe = await meWith(googleToken);
  assert(googleMe.status === 200 && googleMe.data.hasPassword === false, 'Google-only account should report no password');
  const setPassword = await changePassword(googleToken, { newPassword: 'google-set-pass-1' });
  assert(setPassword.status === 200 && setPassword.data.user.hasPassword === true, 'Google-only account should be able to set a password');
  assert((await meWith(googleToken)).status === 401, 'Setting a password should revoke older tokens');
  assert((await meWith(setPassword.data.token)).status === 200, 'Fresh token should work after setting a password');
  const googlePasswordLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: 'google-setter@example.com', password: 'google-set-pass-1' },
  });
  assert(googlePasswordLogin.status === 200, 'Login with the newly set password should work');
  const resetWithoutCurrent = await changePassword(setPassword.data.token, { newPassword: 'another-pass-123' });
  assert(resetWithoutCurrent.status === 400, 'Once a password exists, the current password is required');
  console.log('✓ Google-only accounts can set a password');

  // --- Auth rate limiting behind a proxy (H1) ---
  const limitedEmail = `ratelimit-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX);
  for (let index = 0; index < authMax; index++) {
    const attempt = await request(baseUrl, 'POST', '/api/auth/login', {
      body: { email: limitedEmail, password: 'wrong-password' },
    });
    assert(attempt.status === 401, `Login attempt ${index + 1} should be a normal 401`);
  }
  const blockedLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: limitedEmail, password: 'wrong-password' },
  });
  assert(blockedLogin.status === 429, 'Login should be rate limited per IP + email');
  const otherEmailLogin = await request(baseUrl, 'POST', '/api/auth/login', {
    body: { email: sessionUser.email, password: 'brand-new-pass-1' },
  });
  assert(otherEmailLogin.status === 200, 'Another email from the same IP should not be blocked');
  const otherClient = await request(baseUrl, 'POST', '/api/auth/login', {
    headers: { 'X-Forwarded-For': '203.0.113.7' },
    body: { email: limitedEmail, password: 'wrong-password' },
  });
  assert(otherClient.status === 401, 'With trust proxy, a different forwarded client IP has its own budget');
  console.log('✓ Strict login limiter keyed by client IP + email (trust proxy honored)');

  assert(rateLimitWarnings.length === 0, `express-rate-limit reported: ${rateLimitWarnings.join('; ')}`);
  console.log('✓ No express-rate-limit configuration warnings');
  console.log('\nAll tests passed.');

  server.close();
  await mongod.stop();
  process.exit(0);
};

run().catch((error) => {
  console.error('\nTest flow failed:', error.message);
  process.exit(1);
});
