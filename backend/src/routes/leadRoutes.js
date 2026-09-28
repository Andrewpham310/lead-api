const express = require('express');
const { body } = require('express-validator');
const {
  submitLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  createLeadAsOwner,
  updateLead,
  addNote,
  deleteNote,
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
  body('utmSource').optional({ values: 'falsy' }).trim(),
  body('utmMedium').optional({ values: 'falsy' }).trim(),
  body('utmCampaign').optional({ values: 'falsy' }).trim(),
  body('referrer').optional({ values: 'falsy' }).trim(),
];

const createLeadValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('message').optional({ values: 'falsy' }).trim(),
  body('source').optional({ values: 'falsy' }).trim(),
];

const updateLeadValidation = [
  body('name').optional({ values: 'falsy' }).trim(),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('message').optional({ values: 'falsy' }).trim(),
  body('source').optional({ values: 'falsy' }).trim(),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['new', 'contacted', 'booked', 'lost'])
    .withMessage('Status must be new, contacted, booked, or lost'),
];

const statusValidation = [
  body('status')
    .isIn(['new', 'contacted', 'booked', 'lost'])
    .withMessage('Status must be new, contacted, booked, or lost'),
];

const addNoteValidation = [
  body('text').trim().notEmpty().withMessage('Note text is required'),
  body('updateLastContacted')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('updateLastContacted must be a boolean'),
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
router.post('/owner', protect, createLeadValidation, validate, createLeadAsOwner);
router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById);
router.patch('/:id', protect, updateLeadValidation, validate, updateLead);
router.patch('/:id/status', protect, statusValidation, validate, updateLeadStatus);
router.delete('/:id', protect, deleteLead);
router.post('/:id/notes', protect, addNoteValidation, validate, addNote);
router.delete('/:id/notes/:noteId', protect, deleteNote);

module.exports = router;
