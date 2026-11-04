const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  authProvider: user.authProvider || 'local',
  hasPassword: Boolean(user.password),
});

// @desc    Register a new business owner
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login business owner
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // Same response for unknown emails, wrong passwords, and Google-only accounts
    // (no password) so login does not reveal which emails are registered.
    if (!user || !user.password || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      ...publicUser(user),
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sign out every session (all devices) by invalidating all issued JWTs
// @route   POST /api/auth/logout-all
const logoutAll = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });

    res.json({
      success: true,
      message: 'Signed out of all devices',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change the password (or set one on a Google-only account)
// @route   PATCH /api/auth/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
    }

    // Accounts with a password must prove they know it. Google-only accounts have
    // none; they may set one because the request already carries a valid,
    // current-version session token.
    if (user.password) {
      const matches =
        typeof currentPassword === 'string' &&
        currentPassword.length > 0 &&
        (await user.matchPassword(currentPassword));

      if (!matches) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
    }

    const hadPassword = Boolean(user.password);
    user.password = newPassword;
    // Invalidate every other session; this request gets a fresh token below.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      message: hadPassword
        ? 'Password updated. Other devices have been signed out.'
        : 'Password set. Other devices have been signed out.',
      token: generateToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  publicUser,
  register,
  login,
  getMe,
  logoutAll,
  changePassword,
};