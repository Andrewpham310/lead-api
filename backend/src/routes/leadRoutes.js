const express = require('express');
const { body } = require('express-validator');
const {
  submitLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
} = require('../controllers/leadController');
const protect = require('../middleware/authMiddleware');
const apiKeyAuth = require('../middleware/apiKeyMiddleware');
const validate = require('../middleware/validate');
const { leadSubmitLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

const submitLeadValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('source').optional({ values: 'falsy' }).trim(),
];

const statusValidation = [
  body('status')
    .isIn(['new', 'contacted', 'booked', 'lost'])
    .withMessage('Status must be new, contacted, booked, or lost'),
];

// Public route — API key auth
router.post(
  '/',
  leadSubmitLimiter,
  apiKeyAuth,
  submitLeadValidation,
  validate,
  submitLead
);

// Protected routes — JWT auth
router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById);
router.patch('/:id/status', protect, statusValidation, validate, updateLeadStatus);
router.delete('/:id', protect, deleteLead);

module.exports = router;
