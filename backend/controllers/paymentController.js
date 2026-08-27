const Subscription = require('../models/Subscription');

exports.getQuotaStatus = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    let sub = await Subscription.findOne({ storeId });

    const now = new Date();
    const isSubActive = Boolean(sub && sub.isActive && sub.expiryDate && now <= new Date(sub.expiryDate));

    res.json({
      success: true,
      isActive: isSubActive,
      paymentPending: sub ? sub.paymentPending : false,
      expiryDate: sub ? sub.expiryDate : null
    });
  } catch (error) {
    next(error);
  }
};

exports.requestActivation = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;

    await Subscription.findOneAndUpdate(
      { storeId },
      { paymentPending: true, isActive: false },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Payment request sent successfully." });
  } catch (error) {
    next(error);
  }
};

exports.adminApprove = async (req, res, next) => {
  try {
    const { storeId } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Store ID is required." });
    }

    let sub = await Subscription.findOne({ storeId });

    if (!sub) {
      return res.status(404).json({ success: false, message: "No subscription found for this store." });
    }

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    sub.expiryDate = newExpiry;
    sub.isActive = true;
    sub.paymentPending = false;
    await sub.save();

    res.json({ success: true, message: "Subscription activated successfully for 1 month." });
  } catch (error) {
    next(error);
  }
};