const mongoose = require('mongoose');

// Short-lived, single-use codes (Google login handoff, Business Profile start tickets).
// Only a SHA-256 hash of the code is stored.
const oneTimeCodeSchema = new mongoose.Schema(
  {
    codeHash: {
      type: String,
      required: true,
      unique: true,
    },
    purpose: {
      type: String,
      enum: ['google_login', 'google_business_start'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB removes expired codes in the background; lookups also check expiresAt.
oneTimeCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OneTimeCode', oneTimeCodeSchema);