const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  logoutAll,
  changePassword,
} = require('../controllers/authController');
const {
  startGoogleSignIn,
  googleSignInCallback,
  exchangeGoogleLoginCode,
} = require('../controllers/googleAuthController');
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  loginLimiter,
  registerLimiter,
  googleExchangeLimiter,
  passwordChangeLimiter,
} = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.get('/google', startGoogleSignIn);
router.get('/google/callback', googleSignInCallback);
router.post(
  '/google/exchange',
  googleExchangeLimiter,
  [body('code').isString().withMessage('Code is required').trim().notEmpty().withMessage('Code is required')],
  validate,
  exchangeGoogleLoginCode
);

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', protect, getMe);

router.post('/logout-all', protect, logoutAll);

router.patch(
  '/password',
  protect,
  passwordChangeLimiter,
  [
    body('currentPassword')
      .optional({ values: 'falsy' })
      .isString()
      .withMessage('Current password must be text')
      .isLength({ max: 128 })
      .withMessage('Current password is too long'),
    body('newPassword')
      .isString()
      .withMessage('New password is required')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be 8-128 characters'),
  ],
  validate,
  changePassword
);

module.exports = router;