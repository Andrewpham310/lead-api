const Lead = require('../models/Lead');
const { getBusinessForOwner } = require('./leadController');

// @desc    Get analytics summary for the logged-in owner's business
// @route   GET /api/analytics/summary
const getSummary = async (req, res, next) => {
  try {
    const business = await getBusinessForOwner(req.user.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const businessId = business._id;

    const [newLeads, contactedLeads, bookedLeads, lostLeads] =
      await Promise.all([
        Lead.countDocuments({ businessId, status: 'new' }),
        Lead.countDocuments({ businessId, status: 'contacted' }),
        Lead.countDocuments({ businessId, status: 'booked' }),
        Lead.countDocuments({ businessId, status: 'lost' }),
      ]);

    res.json({
      totalLeads: business.leadCount,
      newLeads,
      contactedLeads,
      bookedLeads,
      lostLeads,
      usageThisMonth: business.usageThisMonth,
      monthlyLimit: business.monthlyLimit,
      plan: business.plan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
