const Business = require('../models/Business');
const Lead = require('../models/Lead');
const { getCurrentMonthKey } = require('./businessController');

const getBusinessForOwner = async (ownerId) => {
  return Business.findOne({ ownerId });
};

// Reset usage counter when a new calendar month starts
const ensureCurrentMonthUsage = async (business) => {
  const currentMonth = getCurrentMonthKey();

  if (business.usageResetMonth !== currentMonth) {
    business.usageThisMonth = 0;
    business.usageResetMonth = currentMonth;
    await business.save();
  }

  return business;
};

// @desc    Submit a lead via public API key
// @route   POST /api/leads
const submitLead = async (req, res, next) => {
  try {
    let business = req.business;
    business = await ensureCurrentMonthUsage(business);

    if (business.usageThisMonth >= business.monthlyLimit) {
      return res.status(403).json({
        success: false,
        message: 'Monthly lead limit reached',
      });
    }

    const { name, phone, email, message, source } = req.body;

    await Lead.create({
      businessId: business._id,
      name,
      phone,
      email,
      message,
      source: source || 'website',
    });

    await Business.findByIdAndUpdate(business._id, {
      $inc: {
        usageThisMonth: 1,
        leadCount: 1,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lead submitted successfully',
    });
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

// @desc    Create a lead manually as owner (doesn't count toward API limit)
// @route   POST /api/leads/owner
const createLeadAsOwner = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const { name, phone, email, message, source } = req.body;

    const lead = await Lead.create({
      businessId: business._id,
      name,
      phone,
      email,
      message,
      source: source || 'other',
    });

    await Business.findByIdAndUpdate(business._id, {
      $inc: { leadCount: 1 },
    });

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a lead's details
// @route   PATCH /api/leads/:id
const updateLead = async (req, res, next) => {
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

    const { name, phone, email, message, source, status } = req.body;

    if (name !== undefined) lead.name = name;
    if (phone !== undefined) lead.phone = phone;
    if (email !== undefined) lead.email = email;
    if (message !== undefined) lead.message = message;
    if (source !== undefined) lead.source = source;
    if (status !== undefined) lead.status = status;

    await lead.save();

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a follow-up note to a lead
// @route   POST /api/leads/:id/notes
const addNote = async (req, res, next) => {
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

    const { text, updateLastContacted } = req.body;

    lead.followUpNotes.push({ text });

    if (updateLastContacted) {
      lead.lastContactedAt = new Date();
    }

    await lead.save();

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a follow-up note
// @route   DELETE /api/leads/:id/notes/:noteId
const deleteNote = async (req, res, next) => {
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

    lead.followUpNotes.id(req.params.noteId).deleteOne();
    await lead.save();

    res.json(lead);
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
  createLeadAsOwner,
  updateLead,
  addNote,
  deleteNote,
  getBusinessForOwner,
};
