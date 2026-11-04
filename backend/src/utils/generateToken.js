const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '7d';

// Pass the user document so the token carries its current tokenVersion.
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
    }
  );
};

module.exports = generateToken;