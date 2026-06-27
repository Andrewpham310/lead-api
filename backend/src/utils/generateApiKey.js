const crypto = require('crypto');

const generateApiKey = () => {
  const randomString = crypto.randomBytes(16).toString('hex');
  return `nw_live_${randomString}`;
};

module.exports = generateApiKey;
