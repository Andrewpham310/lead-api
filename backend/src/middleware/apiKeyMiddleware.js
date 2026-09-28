const Business = require('../models/Business');

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    const business = await Business.findOne({ apiKey });

    if (!business) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = apiKeyAuth;
