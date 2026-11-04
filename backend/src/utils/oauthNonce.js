const crypto = require('crypto');

// Binds an OAuth flow to the browser that started it: a random nonce goes into an
// httpOnly cookie scoped to the callback path, and its hash goes into the signed state.
const NONCE_MAX_AGE_MS = 10 * 60 * 1000;

const hashNonce = (value) => crypto.createHash('sha256').update(String(value)).digest('base64url');

const cookieOptions = (path) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path,
});

// Sets the nonce cookie and returns the hash to embed in the OAuth state.
const issueOAuthNonce = (res, cookieName, path) => {
  const nonce = crypto.randomBytes(32).toString('base64url');
  res.cookie(cookieName, nonce, { ...cookieOptions(path), maxAge: NONCE_MAX_AGE_MS });
  return hashNonce(nonce);
};

const readCookie = (req, name) => {
  const header = req.headers.cookie;

  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index !== -1 && part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
};

// Reads the nonce cookie and always clears it, so each nonce is used at most once.
const takeOAuthNonce = (req, res, cookieName, path) => {
  const value = readCookie(req, cookieName);
  res.clearCookie(cookieName, cookieOptions(path));
  return value;
};

const nonceMatchesState = (cookieValue, stateHash) => {
  if (!cookieValue || typeof stateHash !== 'string' || !stateHash) {
    return false;
  }

  const actual = Buffer.from(hashNonce(cookieValue));
  const expected = Buffer.from(stateHash);

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

module.exports = {
  hashNonce,
  issueOAuthNonce,
  takeOAuthNonce,
  nonceMatchesState,
};