const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Store = require('../models/Store');

exports.getQuotaStatus = async (req, res, next) => {
  try {
    const storeId = req.user.storeId || req.user.id;
    
    let sub = await Subscription.findOne({ storeId });
    const now = new Date();
    const isSubActive = Boolean(sub && sub.isActive && sub.expiryDate && now <= new Date(sub.expiryDate));

    const history = await SubscriptionHistory.find({ storeId }).sort({ purchaseDate: -1 });
    const storeInfo = await Store.findOne({ _id: storeId }) || await Store.findOne({ storeId }) || {};

    res.json({
      success: true,
      isActive: isSubActive,
      paymentPending: sub ? sub.paymentPending : false,
      expiryDate: sub ? sub.expiryDate : null,
      purchaseDate: history[0]?.purchaseDate || null,
      storeName: storeInfo.storeName || 'Store Name',
      storePhone: storeInfo.phone || 'N/A',
      storeAddress: storeInfo.address || 'N/A',
      history: history
    });
  } catch (error) {
    next(error);
  }
};

exports.requestActivation = async (req, res, next) => {
  try {
    const storeId = req.user.storeId || req.user.id;

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
    const now = new Date();
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    if (!sub) {
      sub = new Subscription({ storeId });
    }

    sub.expiryDate = newExpiry;
    sub.isActive = true;
    sub.paymentPending = false;
    await sub.save();

    await SubscriptionHistory.create({
      storeId,
      planName: 'Monthly Plan (₹600)',
      amount: 600,
      purchaseDate: now,
      expiryDate: newExpiry,
      isActive: true
    });

    res.json({ success: true, message: "Subscription activated successfully for 1 month." });
  } catch (error) {
    next(error);
  }
};