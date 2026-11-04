const User = require('../models/User');

const conflictError = () => {
  const error = new Error('This email is already linked to a different Google account');
  error.code = 'GOOGLE_ACCOUNT_CONFLICT';
  return error;
};

// Find, link, or create the user for a verified Google profile.
// Linking an existing email/password account removes its password and bumps
// tokenVersion: registration never verified that email, so whoever set that
// password (and any JWT issued to them) must lose access once the real owner
// proves the address with Google.
const findOrCreateGoogleUser = async ({ sub, email, name }) => {
  const normalizedEmail = String(email).toLowerCase();

  const byGoogleId = await User.findOne({ googleId: sub });
  if (byGoogleId) {
    return byGoogleId;
  }

  const byEmail = await User.findOne({ email: normalizedEmail });

  if (!byEmail) {
    return User.create({
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      googleId: sub,
      authProvider: 'google',
    });
  }

  if (byEmail.googleId && byEmail.googleId !== sub) {
    throw conflictError();
  }

  const linked = await User.findOneAndUpdate(
    { _id: byEmail._id, googleId: null },
    {
      $set: { googleId: sub, authProvider: 'google' },
      $unset: { password: 1 },
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );

  if (linked) {
    return linked;
  }

  // Linked concurrently by another request.
  const current = await User.findById(byEmail._id);
  if (current && current.googleId === sub) {
    return current;
  }

  throw conflictError();
};

module.exports = {
  findOrCreateGoogleUser,
};