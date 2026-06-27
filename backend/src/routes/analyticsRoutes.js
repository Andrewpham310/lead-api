const express = require('express');
const { getSummary } = require('../controllers/analyticsController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, getSummary);

module.exports = router;
