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

    const [newLeads, contactedLeads, bookedLeads, lostLeads, leadsBySource] =
      await Promise.all([
        Lead.countDocuments({ businessId, status: 'new' }),
        Lead.countDocuments({ businessId, status: 'contacted' }),
        Lead.countDocuments({ businessId, status: 'booked' }),
        Lead.countDocuments({ businessId, status: 'lost' }),
        Lead.aggregate([
          { $match: { businessId } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
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
      leadsBySource: leadsBySource.map((item) => ({
        source: item._id,
        count: item.count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
