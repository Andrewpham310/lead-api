const express = require('express');
const { body } = require('express-validator');
const {
  startConnect,
  startConnectRedirect,
  connectCallback,
  getStatus,
  getLocations,
  selectLocation,
  disconnect,
  importProfile,
} = require('../controllers/googleBusinessController');
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// Top-level browser navigations (no Authorization header). The start ticket is
// posted in the form body so it is not a shareable link. The callback is
// authorized by signed state bound to the browser's nonce cookie.
router.post('/business/start', startConnectRedirect);
router.get('/business/start', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Start Google Business Profile from the connect button',
  });
});
router.get('/business/callback', connectCallback);

router.use(protect);

router.get('/business/connect', startConnect);
router.get('/business/status', getStatus);
router.get('/business/locations', getLocations);
router.post(
  '/business/location',
  [
    body('accountId').trim().notEmpty().withMessage('Account is required'),
    body('locationId').trim().notEmpty().withMessage('Location is required'),
  ],
  validate,
  selectLocation
);
router.delete('/business', disconnect);
router.post('/business/import', importProfile);

module.exports = router;
