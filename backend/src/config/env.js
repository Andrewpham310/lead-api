const MIN_SECRET_LENGTH = 32;
// Placeholder values from .env.example / docs that must never reach a real server.
const PLACEHOLDER_PATTERN = /^(replace_with|your_|change_?me|generate_a)/i;

const isGoogleConfiguredIn = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

// Returns a list of problems with the security-sensitive environment variables.
// Never includes secret values in the messages.
const validateEnv = (env = process.env) => {
  const errors = [];

  const requireSecret = (name, hint) => {
    const value = env[name];

    if (!value) {
      errors.push(`${name} is not set${hint ? ` (${hint})` : ''}`);
    } else if (PLACEHOLDER_PATTERN.test(value)) {
      errors.push(`${name} is still a placeholder value`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
  };

  requireSecret('JWT_SECRET');
  requireSecret('OAUTH_STATE_SECRET');

  if (env.JWT_SECRET && env.OAUTH_STATE_SECRET && env.JWT_SECRET === env.OAUTH_STATE_SECRET) {
    errors.push('OAUTH_STATE_SECRET must be different from JWT_SECRET');
  }

  if (isGoogleConfiguredIn(env)) {
    requireSecret('TOKEN_ENCRYPTION_KEY', 'required when Google OAuth is configured');
  }

  return errors;
};

const assertValidEnv = (env = process.env) => {
  const errors = validateEnv(env);

  if (errors.length > 0) {
    console.error('Refusing to start: invalid environment configuration');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error(
      "  Generate a secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('base64url'))\""
    );
    process.exit(1);
  }
};

// TRUST_PROXY: number of proxy hops in front of the API (Render = 1).
// Accepts a hop count, "false"/"true", or an Express trust-proxy string
// (e.g. "loopback" or a comma-separated list of IPs/subnets). Default: 1.
const parseTrustProxy = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 1;
  }

  const trimmed = String(value).trim();

  if (trimmed === 'false') return false;
  if (trimmed === 'true') return true;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  return trimmed;
};

module.exports = {
  MIN_SECRET_LENGTH,
  validateEnv,
  assertValidEnv,
  parseTrustProxy,
};