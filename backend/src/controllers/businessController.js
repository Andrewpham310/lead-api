const Business = require('../models/Business');
const generateApiKey = require('../utils/generateApiKey');

const formatBusinessResponse = (business) => ({
  id: business._id,
  businessName: business.businessName,
  industry: business.industry,
  apiKey: business.apiKey,
  plan: business.plan,
  monthlyLimit: business.monthlyLimit,
  usageThisMonth: business.usageThisMonth,
  leadCount: business.leadCount,
});

const createBusinessWithUniqueApiKey = async (data, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await Business.create({
        ...data,
        apiKey: generateApiKey(),
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.apiKey) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique API key');
};

// @desc    Create a business profile for the logged-in owner
// @route   POST /api/business
const createBusiness = async (req, res, next) => {
  try {
    const existingBusiness = await Business.findOne({ ownerId: req.user.id });

    if (existingBusiness) {
      return res.status(409).json({
        success: false,
        message: 'Business profile already exists for this account',
      });
    }

    const { businessName, industry } = req.body;
    const plan = 'free';
    const monthlyLimit = Business.getMonthlyLimitForPlan(plan);

    const business = await createBusinessWithUniqueApiKey({
      ownerId: req.user.id,
      businessName,
      industry,
      plan,
      monthlyLimit,
      usageResetMonth: getCurrentMonthKey(),
    });

    res.status(201).json(formatBusinessResponse(business));
  } catch (error) {
    next(error);
  }
};

// @desc    Get the logged-in owner's business profile
// @route   GET /api/business/me
const getMyBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    res.json(formatBusinessResponse(business));
  } catch (error) {
    next(error);
  }
};

// @desc    Update the logged-in owner's business profile
// @route   PATCH /api/business/me
const updateMyBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const { businessName, industry } = req.body;

    if (businessName !== undefined) {
      business.businessName = businessName;
    }

    if (industry !== undefined) {
      business.industry = industry;
    }

    await business.save();

    res.json(formatBusinessResponse(business));
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate API key for the logged-in owner's business
// @route   POST /api/business/regenerate-api-key
const regenerateApiKey = async (req, res, next) => {
  try {
    const business = await Business.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    let updated = false;

    for (let attempt = 0; attempt < 3 && !updated; attempt++) {
      business.apiKey = generateApiKey();
      try {
        await business.save();
        updated = true;
      } catch (error) {
        if (!(error.code === 11000 && error.keyPattern?.apiKey)) {
          throw error;
        }
      }
    }

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to regenerate API key',
      });
    }

    res.json(formatBusinessResponse(business));
  } catch (error) {
    next(error);
  }
};

const getCurrentMonthKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

module.exports = {
  createBusiness,
  getMyBusiness,
  updateMyBusiness,
  regenerateApiKey,
  getCurrentMonthKey,
};
