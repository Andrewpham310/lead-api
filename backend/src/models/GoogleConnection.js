const mongoose = require('mongoose');

const googleConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    refreshToken: {
      type: String,
      required: true,
      select: false,
    },
    tokenExpiry: {
      type: Date,
    },
    accountId: {
      type: String,
    },
    locationId: {
      type: String,
    },
    locationTitle: {
      type: String,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GoogleConnection', googleConnectionSchema);
