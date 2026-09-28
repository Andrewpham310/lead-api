const { KNOWN_SOURCES } = require('../utils/sourceUtils');

// @desc    Get list of known source options
// @route   GET /api/sources
const getSources = async (req, res, next) => {
  try {
    res.json({
      sources: KNOWN_SOURCES,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSources,
};
