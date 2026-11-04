const Business = require('../models/Business');
const GoogleConnection = require('../models/GoogleConnection');
const { formatBusinessResponse } = require('./businessController');
const { encrypt, decrypt } = require('../utils/tokenCrypto');
const { signOAuthState, verifyOAuthState } = require('../utils/oauthState');
const { issueOAuthNonce, takeOAuthNonce, nonceMatchesState } = require('../utils/oauthNonce');
const { issueOneTimeCode, consumeOneTimeCode } = require('../utils/oneTimeCode');
const {
  isGoogleConfigured,
  createOAuthClient,
  frontendUrl,
  callbackUrl,
} = require('../utils/googleConfig');
const { listAllLocations, getLocation, toProfileSnapshot } = require('../utils/googleBusinessApi');

const BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const CALLBACK_PATH = '/api/google/business/callback';
const START_PATH = '/api/google/business/start';
const NONCE_COOKIE = 'g_business_nonce';
const START_TICKET_PURPOSE = 'google_business_start';
const START_TICKET_TTL_SECONDS = 60;

const redirectToBusiness = (res, params) => {
  const url = new URL('/business', `${frontendUrl()}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  res.redirect(url.toString());
};

const findConnection = (userId) => {
  return GoogleConnection.findOne({ userId }).select('+refreshToken');
};

const accessTokenFor = async (connection) => {
  let refreshToken;

  try {
    refreshToken = decrypt(connection.refreshToken);
  } catch {
    const error = new Error('Could not read the stored Google token. Reconnect Google Business Profile.');
    error.statusCode = 401;
    throw error;
  }

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();

  if (!token) {
    const error = new Error('Could not refresh Google access. Reconnect Google Business Profile.');
    error.statusCode = 401;
    throw error;
  }

  return token;
};

const publicStatus = (connection) => {
  if (!connection) {
    return { connected: false };
  }

  return {
    connected: true,
    accountId: connection.accountId || null,
    locationId: connection.locationId || null,
    locationTitle: connection.locationTitle || null,
    connectedAt: connection.connectedAt,
  };
};

// @desc    Start Google Business Profile OAuth. Returns the API start URL and a
//          short-lived, single-use ticket. The browser form-posts the ticket so it
//          never appears in a link, the address bar, or history. That top-level POST
//          sets the nonce cookie on the API host (works when the frontend and API
//          are on different domains).
// @route   GET /api/google/business/connect
const startConnect = async (req, res, next) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Google Business Profile is not configured',
      });
    }

    const ticket = await issueOneTimeCode({
      purpose: START_TICKET_PURPOSE,
      userId: req.user.id,
      ttlSeconds: START_TICKET_TTL_SECONDS,
    });

    res.json({
      url: callbackUrl(req, START_PATH),
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Redeem the start ticket from the POST body, bind the flow to this browser, and redirect to Google
// @route   POST /api/google/business/start
const startConnectRedirect = async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'not_configured',
      });
    }

    // Body only. A ticket in the query string is ignored so a copied link cannot start the flow.
    const ticket = await consumeOneTimeCode({
      code: req.body?.ticket,
      purpose: START_TICKET_PURPOSE,
    });

    if (!ticket) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'expired',
      });
    }

    const redirectUri = callbackUrl(req, CALLBACK_PATH);
    const client = createOAuthClient(redirectUri);
    const nonce = issueOAuthNonce(res, NONCE_COOKIE, CALLBACK_PATH);
    const state = signOAuthState({
      purpose: 'google_business',
      userId: String(ticket.userId),
      nonce,
    });
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [BUSINESS_SCOPE],
      state,
    });

    res.redirect(url);
  } catch (error) {
    console.error('Google Business Profile start failed:', error?.response?.data || error.message || error);
    redirectToBusiness(res, {
      google: 'error',
      reason: 'start_failed',
    });
  }
};

// @desc    Store the Business Profile refresh token and pick a location when there is only one
// @route   GET /api/google/business/callback
const connectCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const cookieNonce = takeOAuthNonce(req, res, NONCE_COOKIE, CALLBACK_PATH);

    if (error) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'cancelled',
      });
    }

    if (!code || !state || !isGoogleConfigured()) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'failed',
      });
    }

    let statePayload;

    try {
      statePayload = verifyOAuthState(state);
    } catch {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'state_expired',
      });
    }

    if (statePayload.purpose !== 'google_business' || !statePayload.userId) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'invalid',
      });
    }

    // The callback must land in the same browser that started the flow.
    if (!nonceMatchesState(cookieNonce, statePayload.nonce)) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'unverified',
      });
    }

    const redirectUri = callbackUrl(req, CALLBACK_PATH);
    const client = createOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return redirectToBusiness(res, {
        google: 'error',
        reason: 'no_refresh',
      });
    }

    await GoogleConnection.findOneAndUpdate(
      { userId: statePayload.userId },
      {
        userId: statePayload.userId,
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        accountId: null,
        locationId: null,
        locationTitle: null,
        connectedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let locations = [];

    try {
      if (tokens.access_token) {
        locations = await listAllLocations(tokens.access_token);
      }
    } catch (listError) {
      console.error(
        'Google Business Profile location lookup failed:',
        listError?.response?.data || listError.message || listError
      );
      return redirectToBusiness(res, { google: 'connected' });
    }

    if (locations.length === 1) {
      await GoogleConnection.updateOne(
        { userId: statePayload.userId },
        {
          accountId: locations[0].accountId,
          locationId: locations[0].locationId,
          locationTitle: locations[0].title,
        }
      );
      return redirectToBusiness(res, { google: 'connected' });
    }

    if (locations.length === 0) {
      return redirectToBusiness(res, { google: 'none' });
    }

    return redirectToBusiness(res, { google: 'choose' });
  } catch (error) {
    console.error('Google Business Profile callback failed:', error?.response?.data || error.message || error);
    redirectToBusiness(res, {
      google: 'error',
      reason: 'failed',
    });
  }
};

// @desc    Connection status for the signed-in owner
// @route   GET /api/google/business/status
const getStatus = async (req, res, next) => {
  try {
    const connection = await GoogleConnection.findOne({ userId: req.user.id });
    res.json(publicStatus(connection));
  } catch (error) {
    next(error);
  }
};

// @desc    Locations available on the connected Google account
// @route   GET /api/google/business/locations
const getLocations = async (req, res, next) => {
  try {
    const connection = await findConnection(req.user.id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connect Google Business Profile first',
      });
    }

    const accessToken = await accessTokenFor(connection);
    const locations = await listAllLocations(accessToken);

    res.json({
      locations: locations.map(({ accountId, locationId, title }) => ({
        accountId,
        locationId,
        title,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save the location this account will import
// @route   POST /api/google/business/location
const selectLocation = async (req, res, next) => {
  try {
    const { accountId, locationId } = req.body;
    const connection = await findConnection(req.user.id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connect Google Business Profile first',
      });
    }

    const accessToken = await accessTokenFor(connection);
    const locations = await listAllLocations(accessToken);
    const match = locations.find(
      (location) => location.accountId === accountId && location.locationId === locationId
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'That location is not on the connected Google account',
      });
    }

    connection.accountId = match.accountId;
    connection.locationId = match.locationId;
    connection.locationTitle = match.title;
    await connection.save();

    res.json(publicStatus(connection));
  } catch (error) {
    next(error);
  }
};

// @desc    Remove stored Google Business Profile tokens
// @route   DELETE /api/google/business
const disconnect = async (req, res, next) => {
  try {
    const connection = await GoogleConnection.findOneAndDelete({ userId: req.user.id });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Google Business Profile is not connected',
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Copy the selected location onto the owner's business profile
// @route   POST /api/google/business/import
const importProfile = async (req, res, next) => {
  try {
    const connection = await findConnection(req.user.id);

    if (!connection) {
      return res.status(400).json({
        success: false,
        message: 'Connect Google Business Profile first',
      });
    }

    if (!connection.locationId) {
      return res.status(400).json({
        success: false,
        message: 'Select a Google location first',
      });
    }

    const business = await Business.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Create a business profile before importing Google data',
      });
    }

    const accessToken = await accessTokenFor(connection);
    const location = await getLocation(accessToken, connection.locationId);

    business.googleLocationId = connection.locationId;
    business.googleProfile = toProfileSnapshot(location);
    await business.save();

    res.json(formatBusinessResponse(business));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConnect,
  startConnectRedirect,
  connectCallback,
  getStatus,
  getLocations,
  selectLocation,
  disconnect,
  importProfile,
};
