const mongoose = require('mongoose');

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
      required: [true, 'Message is required'],
      trim: true,
    },
    source: {
      type: String,
      default: 'website',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'booked', 'lost'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
