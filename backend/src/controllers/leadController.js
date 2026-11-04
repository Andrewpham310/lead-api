const Business = require('../models/Business');
const Lead = require('../models/Lead');
const { getCurrentMonthKey } = require('./businessController');
const { LEAD_SUBMITTED_RESPONSE } = require('../middleware/leadSpamMiddleware');

const getBusinessForOwner = async (ownerId) => {
  return Business.findOne({ ownerId });
};

// Atomically reserve one lead slot for this month. Returns the updated business,
// or null when the monthly limit is already reached. Concurrent submissions can
// never push usageThisMonth past monthlyLimit.
const reserveMonthlySlot = async (businessId, month) => {
  // Month rollover: only the first request of a new month resets the counter.
  await Business.updateOne(
    { _id: businessId, usageResetMonth: { $ne: month } },
    { $set: { usageThisMonth: 0, usageResetMonth: month } }
  );

  return Business.findOneAndUpdate(
    {
      _id: businessId,
      usageResetMonth: month,
      $expr: {
        $lt: [
          { $ifNull: ['$usageThisMonth', 0] },
          { $ifNull: ['$monthlyLimit', Business.getMonthlyLimitForPlan('free')] },
        ],
      },
    },
    { $inc: { usageThisMonth: 1, leadCount: 1 } },
    { new: true }
  );
};

// Give the slot back when the lead could not be stored.
const releaseMonthlySlot = async (businessId, month) => {
  await Promise.all([
    Business.updateOne(
      { _id: businessId, usageResetMonth: month, usageThisMonth: { $gt: 0 } },
      { $inc: { usageThisMonth: -1 } }
    ),
    Business.updateOne({ _id: businessId, leadCount: { $gt: 0 } }, { $inc: { leadCount: -1 } }),
  ]);
};

// @desc    Submit a lead via public API key
// @route   POST /api/leads
const submitLead = async (req, res, next) => {
  try {
    const businessId = req.business._id;
    const month = getCurrentMonthKey();
    const reserved = await reserveMonthlySlot(businessId, month);

    if (!reserved) {
      return res.status(403).json({
        success: false,
        message: 'Monthly lead limit reached',
      });
    }

    const { name, phone, email, message, source } = req.body;

    try {
      await Lead.create({
        businessId,
        name,
        phone,
        email,
        message,
        source: source || 'website',
      });
    } catch (createError) {
      await releaseMonthlySlot(businessId, month).catch((releaseError) => {
        console.error('Failed to release lead slot:', releaseError.message);
      });
      throw createError;
    }

    res.status(201).json(LEAD_SUBMITTED_RESPONSE);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leads for the logged-in owner's business
// @route   GET /api/leads
const getLeads = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const leads = await Lead.find({ businessId: business._id }).sort({
      createdAt: -1,
    });

    res.json(leads);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single lead by ID
// @route   GET /api/leads/:id
const getLeadById = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      businessId: business._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

// @desc    Update lead status
// @route   PATCH /api/leads/:id/status
const updateLeadStatus = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      businessId: business._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    lead.status = req.body.status;
    await lead.save();

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
const deleteLead = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      businessId: business._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  getBusinessForOwner,
};
