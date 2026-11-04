const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { publicUser } = require('./authController');
const { signOAuthState, verifyOAuthState } = require('../utils/oauthState');
const { issueOAuthNonce, takeOAuthNonce, nonceMatchesState } = require('../utils/oauthNonce');
const { issueOneTimeCode, consumeOneTimeCode } = require('../utils/oneTimeCode');
const { findOrCreateGoogleUser } = require('../utils/googleUser');
const {
  isGoogleConfigured,
  createOAuthClient,
  frontendUrl,
  callbackUrl,
} = require('../utils/googleConfig');

const SIGN_IN_SCOPES = ['openid', 'email', 'profile'];
const CALLBACK_PATH = '/api/auth/google/callback';
const NONCE_COOKIE = 'g_signin_nonce';
const LOGIN_CODE_PURPOSE = 'google_login';
const LOGIN_CODE_TTL_SECONDS = 60;

// Short codes only. The login page maps these to fixed copy and never shows raw query text.
const redirectToLogin = (res, code) => {
  const url = new URL('/login', `${frontendUrl()}/`);
  url.searchParams.set('error', code);
  res.redirect(url.toString());
};

// @desc    Start Google sign-in
// @route   GET /api/auth/google
const startGoogleSignIn = (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Google sign-in is not configured',
    });
  }

  const redirectUri = callbackUrl(req, CALLBACK_PATH);
  const client = createOAuthClient(redirectUri);
  const nonce = issueOAuthNonce(res, NONCE_COOKIE, CALLBACK_PATH);
  const state = signOAuthState({ purpose: 'google_signin', nonce });
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: SIGN_IN_SCOPES,
    state,
    prompt: 'select_account',
  });

  res.redirect(url);
};

// @desc    Finish Google sign-in and hand a one-time login code to the frontend
// @route   GET /api/auth/google/callback
const googleSignInCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const cookieNonce = takeOAuthNonce(req, res, NONCE_COOKIE, CALLBACK_PATH);

    if (error) {
      return redirectToLogin(res, 'cancelled');
    }

    if (!code || !state) {
      return redirectToLogin(res, 'failed');
    }

    let statePayload;

    try {
      statePayload = verifyOAuthState(state);
    } catch {
      return redirectToLogin(res, 'expired');
    }

    if (statePayload.purpose !== 'google_signin') {
      return redirectToLogin(res, 'invalid');
    }

    // The callback must land in the same browser that started the flow.
    if (!nonceMatchesState(cookieNonce, statePayload.nonce)) {
      return redirectToLogin(res, 'unverified');
    }

    if (!isGoogleConfigured()) {
      return redirectToLogin(res, 'not_configured');
    }

    const redirectUri = callbackUrl(req, CALLBACK_PATH);
    const client = createOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      return redirectToLogin(res, 'no_identity');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();

    if (!profile?.email || profile.email_verified !== true) {
      return redirectToLogin(res, 'no_email');
    }

    let user;

    try {
      user = await findOrCreateGoogleUser({
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
      });
    } catch (linkError) {
      if (linkError.code === 'GOOGLE_ACCOUNT_CONFLICT') {
        return redirectToLogin(res, 'conflict');
      }
      throw linkError;
    }

    // Never put the app JWT in a URL: the frontend swaps this short-lived,
    // single-use code for it via POST /api/auth/google/exchange.
    const loginCode = await issueOneTimeCode({
      purpose: LOGIN_CODE_PURPOSE,
      userId: user._id,
      ttlSeconds: LOGIN_CODE_TTL_SECONDS,
    });
    const url = new URL('/auth/google/callback', `${frontendUrl()}/`);
    url.searchParams.set('code', loginCode);
    res.redirect(url.toString());
  } catch (error) {
    console.error('Google sign-in callback failed:', error?.response?.data || error.message || error);
    redirectToLogin(res, 'failed');
  }
};

// @desc    Exchange a one-time Google login code for the app JWT
// @route   POST /api/auth/google/exchange
const exchangeGoogleLoginCode = async (req, res, next) => {
  try {
    const loginCode = await consumeOneTimeCode({
      code: req.body.code,
      purpose: LOGIN_CODE_PURPOSE,
    });
    const user = loginCode ? await User.findById(loginCode.userId) : null;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired sign-in code',
      });
    }

    res.json({
      token: generateToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startGoogleSignIn,
  googleSignInCallback,
  exchangeGoogleLoginCode,
};