const crypto = require('crypto');

const getKey = () => {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    const error = new Error('TOKEN_ENCRYPTION_KEY is not set');
    error.statusCode = 500;
    throw error;
  }

  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
};

const decrypt = (payload) => {
  const [ivB64, tagB64, dataB64] = String(payload || '').split('.');

  if (!ivB64 || !tagB64 || !dataB64) {
    const error = new Error('Stored Google token is invalid');
    error.statusCode = 500;
    throw error;
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

module.exports = {
  encrypt,
  decrypt,
};
