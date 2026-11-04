const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      required: [
        function passwordRequired() {
          return this.authProvider !== 'google' && !this.googleId;
        },
        'Password is required',
      ],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    // Bumped to invalidate every JWT issued before (e.g. when a Google login takes
    // over an unverified email/password account).
    tokenVersion: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      default: 'business_owner',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving when it has been changed
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
