const Subscription = require('../models/Subscription');

const checkSubscriptionAndQuota = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const requestedCount = req.body.requestedCount || 1;

    const sub = await Subscription.findOne({ storeId });
    if (!sub) {
      return res.status(403).json({ success: false, message: "Subscription record not found for this store." });
    }

    const now = new Date();
    if (!sub.isActive || now > new Date(sub.expiryDate)) {
      return res.status(403).json({ success: false, message: "Subscription expired. Please renew the ₹500 plan." });
    }

    const monthlyRemaining = sub.monthlyBrLimit - sub.monthlyBrUsed;
    const totalAvailableBRs = monthlyRemaining + sub.addonBrBalance;

    if (requestedCount > totalAvailableBRs) {
      return res.status(403).json({
        success: false,
        message: `BR limit exhausted! Required: ${requestedCount}, Available: ${totalAvailableBRs}.`
      });
    }

    if (monthlyRemaining >= requestedCount) {
      sub.monthlyBrUsed += requestedCount;
    } else {
      const leftover = requestedCount - monthlyRemaining;
      sub.monthlyBrUsed = sub.monthlyBrLimit;
      sub.addonBrBalance -= leftover;
    }
    await sub.save();

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error verifying limits", error: error.message });
  }
};

module.exports = { checkSubscriptionAndQuota };