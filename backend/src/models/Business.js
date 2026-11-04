const mongoose = require('mongoose');
const { WEEKDAYS } = require('../utils/businessProfile');

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
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 30,
    },
    website: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    serviceCatalog: {
      type: [
        new mongoose.Schema(
          {
            name: {
              type: String,
              required: true,
              trim: true,
              maxlength: 120,
            },
            description: {
              type: String,
              trim: true,
              default: '',
              maxlength: 500,
            },
            price: {
              type: String,
              trim: true,
              default: '',
              maxlength: 40,
            },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    businessHours: {
      type: [
        new mongoose.Schema(
          {
            day: {
              type: String,
              enum: WEEKDAYS,
              required: true,
            },
            closed: {
              type: Boolean,
              default: false,
            },
            open: {
              type: String,
              trim: true,
              default: '',
            },
            close: {
              type: String,
              trim: true,
              default: '',
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    // When Turnstile is configured on the server (TURNSTILE_SECRET_KEY), public lead
    // submissions must carry a captcha token. Owners who post leads from their own
    // server can switch this off (the form key is public, so that also removes the
    // captcha protection from the hosted form).
    requireCaptcha: {
      type: Boolean,
      default: true,
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
    googleLocationId: {
      type: String,
    },
    googleProfile: {
      name: String,
      category: String,
      address: String,
      phone: String,
      website: String,
      hours: {
        type: [
          new mongoose.Schema(
            {
              day: String,
              open: String,
              close: String,
            },
            { _id: false }
          ),
        ],
        default: undefined,
      },
      mapsUri: String,
      lastSyncedAt: Date,
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
