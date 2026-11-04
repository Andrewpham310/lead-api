const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Limits can be tuned per deployment (and lowered/raised in tests) via env vars.
const limitFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const limitMessage = (message) => ({
  success: false,
  message,
});

// IPv6 clients usually control a whole /64, so group them by that prefix
// instead of the full address (otherwise one client could rotate addresses).
const clientIpKey = (req) => {
  const ip = String(req.ip || '');

  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  if (!ip.includes(':')) {
    return ip;
  }

  const [head, tail = ''] = ip.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  const full = [...headParts, ...Array(missing).fill('0'), ...tailParts];

  return `${full.slice(0, 4).map((part) => part || '0').join(':')}::/64`;
};

const normalizedEmail = (req) => {
  const email = req.body?.email;
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
};

const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: limitFromEnv('RATE_LIMIT_MAX', 100),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: limitMessage('Too many requests, please try again later'),
});

// Strict limiter for credential endpoints, keyed by IP + submitted email
// (or IP + user for authenticated routes) so one client cannot hammer an account.
const createAuthLimiter = (name, keyFor = normalizedEmail) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: limitFromEnv('AUTH_RATE_LIMIT_MAX', 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${name}|${clientIpKey(req)}|${keyFor(req)}`,
    message: limitMessage('Too many attempts, please try again in 15 minutes'),
  });

const loginLimiter = createAuthLimiter('login');
const registerLimiter = createAuthLimiter('register');
const googleExchangeLimiter = createAuthLimiter('google-exchange', () => '');
const passwordChangeLimiter = createAuthLimiter('password', (req) => String(req.user?.id || ''));

// Per-IP limit on public lead submissions.
const leadSubmitLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: limitFromEnv('LEAD_IP_RATE_LIMIT_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: limitMessage('Too many lead submissions, please try again later'),
});

// Per-business limit on public lead submissions (runs after apiKeyAuth). Caps how
// fast anyone holding the public form key can burn through the monthly quota, no
// matter how many IPs they use.
const leadApiKeyLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: limitFromEnv('LEAD_KEY_RATE_LIMIT_MAX', 30),
  // Only stored leads count; over-quota (403) or failed submissions do not.
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `business|${req.business?._id || clientIpKey(req)}`,
  message: limitMessage('This form is receiving too many submissions. Please try again later.'),
});

module.exports = {
  clientIpKey,
  generalLimiter,
  loginLimiter,
  registerLimiter,
  googleExchangeLimiter,
  passwordChangeLimiter,
  leadSubmitLimiter,
  leadApiKeyLimiter,
};