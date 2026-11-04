const { OAuth2Client } = require('google-auth-library');

const isGoogleConfigured = () => {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

const createOAuthClient = (redirectUri) => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

const frontendUrl = () => {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
};

const callbackUrl = (req, path) => {
  // Prefer an explicit public API URL so localhost vs 127.0.0.1 (and Vite proxy Host)
  // cannot make Google reject the redirect_uri.
  const configured = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (configured) {
    return `${configured}${path}`;
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  let host = req.get('host') || `localhost:${process.env.PORT || 5000}`;

  if (host.startsWith('127.0.0.1')) {
    host = host.replace('127.0.0.1', 'localhost');
  }

  return `${protocol}://${host}${path}`;
};

module.exports = {
  isGoogleConfigured,
  createOAuthClient,
  frontendUrl,
  callbackUrl,
};
