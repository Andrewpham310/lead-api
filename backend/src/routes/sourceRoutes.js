const express = require('express');
const { getSources } = require('../controllers/sourceController');

const router = express.Router();

router.get('/', getSources);

module.exports = router;
