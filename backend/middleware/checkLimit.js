const Subscription = require('../models/Subscription');

const checkSubscriptionAndQuota = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const sub = await Subscription.findOne({ storeId });

    const now = new Date();
    if (!sub || !sub.isActive || !sub.expiryDate || now > new Date(sub.expiryDate)) {
      return res.status(403).json({ 
        success: false, 
        message: "Subscription expired! Please pay ₹600 via UPI to continue." 
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error verifying subscription", error: error.message });
  }
};

module.exports = { checkSubscriptionAndQuota };