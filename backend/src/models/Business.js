const mongoose = require('mongoose');

const PLAN_LIMITS = {
  free: 100,
  starter: 1000,
  pro: 5000,
};

const businessSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro'],
      default: 'free',
    },
    monthlyLimit: {
      type: Number,
      default: PLAN_LIMITS.free,
    },
    usageThisMonth: {
      type: Number,
      default: 0,
    },
    // Tracks which month usageThisMonth applies to (e.g. "2026-06")
    usageResetMonth: {
      type: String,
    },
    leadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

businessSchema.index({ ownerId: 1 });

businessSchema.statics.getMonthlyLimitForPlan = function (plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

module.exports = mongoose.model('Business', businessSchema);
