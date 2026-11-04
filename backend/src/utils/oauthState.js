const jwt = require('jsonwebtoken');

// OAuth state is signed with its own key so a leaked or guessed state secret can
// never be used to mint session JWTs (and vice versa).
const signOAuthState = (payload) => {
  return jwt.sign(payload, process.env.OAUTH_STATE_SECRET, {
    algorithm: 'HS256',
    expiresIn: '10m',
  });
};

const verifyOAuthState = (state) => {
  return jwt.verify(state, process.env.OAUTH_STATE_SECRET, { algorithms: ['HS256'] });
};

module.exports = {
  signOAuthState,
  verifyOAuthState,
};