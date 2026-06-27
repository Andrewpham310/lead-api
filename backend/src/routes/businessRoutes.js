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

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [body('businessName').trim().notEmpty().withMessage('Business name is required')],
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
    body('industry').optional().trim(),
  ],
  validate,
  updateMyBusiness
);

router.post('/regenerate-api-key', regenerateApiKey);

module.exports = router;
