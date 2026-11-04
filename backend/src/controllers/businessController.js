const Business = require('../models/Business');
const generateApiKey = require('../utils/generateApiKey');
const { applyProfileFields } = require('../utils/businessProfile');

const formatBusinessResponse = (business) => ({
  id: business._id,
  businessName: business.businessName,
  industry: business.industry,
  address: business.address || '',
  phone: business.phone || '',
  website: business.website || '',
  serviceCatalog: (business.serviceCatalog || []).map((service) => ({
    id: service._id,
    name: service.name,
    description: service.description || '',
    price: service.price || '',
  })),
  businessHours: (business.businessHours || []).map((period) => ({
    day: period.day,
    closed: Boolean(period.closed),
    open: period.open || '',
    close: period.close || '',
  })),
  apiKey: business.apiKey,
  requireCaptcha: business.requireCaptcha !== false,
  captchaEnabled: Boolean(process.env.TURNSTILE_SECRET_KEY),
  plan: business.plan,
  monthlyLimit: business.monthlyLimit,
  usageThisMonth: business.usageThisMonth,
  leadCount: business.leadCount,
  googleLocationId: business.googleLocationId || null,
  googleProfile: business.googleProfile?.lastSyncedAt
    ? {
        name: business.googleProfile.name,
        category: business.googleProfile.category || '',
        address: business.googleProfile.address || '',
        phone: business.googleProfile.phone || '',
        website: business.googleProfile.website || '',
        hours: business.googleProfile.hours || [],
        mapsUri: business.googleProfile.mapsUri || '',
        lastSyncedAt: business.googleProfile.lastSyncedAt || null,
      }
    : null,
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

    const { businessName } = req.body;
    const plan = 'free';
    const monthlyLimit = Business.getMonthlyLimitForPlan(plan);
    const businessData = {
      ownerId: req.user.id,
      businessName,
      plan,
      monthlyLimit,
      usageResetMonth: getCurrentMonthKey(),
    };

    applyProfileFields(businessData, req.body);

    const business = await createBusinessWithUniqueApiKey(businessData);

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

    const { businessName } = req.body;

    if (businessName !== undefined) {
      business.businessName = businessName;
    }

    applyProfileFields(business, req.body);

    if (typeof req.body.requireCaptcha === 'boolean') {
      business.requireCaptcha = req.body.requireCaptcha;
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
  formatBusinessResponse,
};
