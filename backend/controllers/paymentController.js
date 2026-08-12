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
      expiryDate: sub?.expiryDate || null
    });
  } catch (error) {
    next(error);
  }
};

exports.activateMonthlySubscription = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    let sub = await Subscription.findOne({ storeId });

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1); // Exact 1 Month extension

    if (!sub) {
      sub = await Subscription.create({
        storeId,
        expiryDate: newExpiry,
        isActive: true
      });
    } else {
      sub.expiryDate = newExpiry;
      sub.isActive = true;
      await sub.save();
    }

    res.json({ success: true, message: "Subscription renewed successfully for 1 month!" });
  } catch (error) {
    next(error);
  }
};