const crypto = require('crypto');
const OneTimeCode = require('../models/OneTimeCode');

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const issueOneTimeCode = async ({ purpose, userId, ttlSeconds = 60 }) => {
  const code = crypto.randomBytes(32).toString('base64url');

  await OneTimeCode.create({
    codeHash: hashCode(code),
    purpose,
    userId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });

  return code;
};

// Atomically deletes the code so it can only be used once. Returns null when the
// code is unknown, already used, expired, or issued for a different purpose.
const consumeOneTimeCode = async ({ code, purpose }) => {
  if (typeof code !== 'string' || !code || code.length > 200) {
    return null;
  }

  return OneTimeCode.findOneAndDelete({
    codeHash: hashCode(code),
    purpose,
    expiresAt: { $gt: new Date() },
  });
};

module.exports = {
  issueOneTimeCode,
  consumeOneTimeCode,
};