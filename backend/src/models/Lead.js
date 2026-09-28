const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const leadSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: 'website',
    },
    utmSource: {
      type: String,
      trim: true,
    },
    utmMedium: {
      type: String,
      trim: true,
    },
    utmCampaign: {
      type: String,
      trim: true,
    },
    referrer: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'booked', 'lost'],
      default: 'new',
    },
    followUpNotes: {
      type: [noteSchema],
      default: [],
    },
    lastContactedAt: {
      type: Date,
    },
    nextFollowUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
