const express = require('express');
const { body } = require('express-validator');
const {
  createBusiness,
  getMyBusiness,
  updateMyBusiness,
  regenerateApiKey,
} = require('../controllers/businessController');
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { WEEKDAYS, TIME_PATTERN, isHttpUrl, normalizeWebsite } = require('../utils/businessProfile');

const router = express.Router();

const profileFieldValidators = [
  body('industry').optional({ values: 'falsy' }).trim(),
  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Address is too long'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone number is too long')
    .custom((value) => {
      if (!/^[0-9+().\-\s]+$/.test(value)) {
        throw new Error('Enter a valid phone number');
      }

      const digits = value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        throw new Error('Enter a valid phone number');
      }

      return true;
    }),
  body('website')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (normalizeWebsite(value).length > 300) {
        throw new Error('Website is too long');
      }

      if (!isHttpUrl(value)) {
        throw new Error('Enter a valid website URL');
      }

      return true;
    }),
  body('serviceCatalog')
    .optional()
    .custom((catalog) => {
      if (!Array.isArray(catalog)) {
        throw new Error('Service catalog must be a list');
      }

      if (catalog.length > 50) {
        throw new Error('You can list up to 50 services');
      }

      catalog.forEach((service) => {
        if (!service || typeof service !== 'object') {
          throw new Error('Each service needs a name');
        }

        const name = String(service.name || '').trim();
        const description = String(service.description || '').trim();
        const price = String(service.price || '').trim();

        if (!name && !description && !price) return;
        if (!name) throw new Error('Each service needs a name');
        if (name.length > 120) throw new Error('Service name is too long');
        if (description.length > 500) throw new Error('Service description is too long');
        if (price.length > 40) throw new Error('Service price is too long');
      });

      return true;
    }),
  body('businessHours')
    .optional()
    .custom((hours) => {
      if (!Array.isArray(hours)) {
        throw new Error('Business hours must be a list');
      }

      if (hours.length > 7) {
        throw new Error('Business hours can include one entry per day');
      }

      const seen = new Set();

      hours.forEach((period) => {
        if (!period || typeof period !== 'object' || !WEEKDAYS.includes(period.day)) {
          throw new Error('Business hours must use a weekday name');
        }

        if (seen.has(period.day)) {
          throw new Error('Each weekday can only appear once');
        }

        seen.add(period.day);

        if (period.closed) return;

        const open = String(period.open || '').trim();
        const close = String(period.close || '').trim();

        if (!open && !close) return;

        if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) {
          throw new Error(`Enter an open and close time for ${period.day}, or mark it closed`);
        }

        if (open >= close) {
          throw new Error(`${period.day} closing time must be after the opening time`);
        }
      });

      return true;
    }),
];

router.use(protect);

router.post(
  '/',
  [
    body('businessName').trim().notEmpty().withMessage('Business name is required'),
    ...profileFieldValidators,
  ],
  validate,
  createBusiness
);

router.get('/me', getMyBusiness);

router.patch(
  '/me',
  [
    body('businessName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Business name cannot be empty'),
    body('requireCaptcha')
      .optional()
      .isBoolean({ strict: true })
      .withMessage('requireCaptcha must be true or false'),
    ...profileFieldValidators,
  ],
  validate,
  updateMyBusiness
);

router.post('/regenerate-api-key', regenerateApiKey);

module.exports = router;
