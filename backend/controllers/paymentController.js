const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createMonthlyOrder = async (req, res, next) => {
  try {
    const options = {
      amount: 500 * 100, 
      currency: "INR",
      receipt: `receipt_monthly_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

exports.verifyMonthlyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, storeId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    const sub = await Subscription.findOne({ storeId });
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    sub.expiryDate = newExpiry;
    sub.monthlyBrLimit = 200; 
    sub.monthlyBrUsed = 0;
    sub.isActive = true;
    await sub.save();

    res.json({ success: true, message: "Monthly subscription renewed successfully!" });
  } catch (error) {
    next(error);
  }
};

exports.createAddonOrder = async (req, res, next) => {
  try {
    const options = {
      amount: 100 * 100, // ₹100
      currency: "INR",
      receipt: `receipt_addon_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

exports.verifyAddonPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, storeId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    await Subscription.findOneAndUpdate(
      { storeId },
      { $inc: { addonBrBalance: 25 } },
      { new: true }
    );

    res.json({ success: true, message: "Successfully added 25 extra barcode credits!" });
  } catch (error) {
    next(error);
  }
};
// Fetch Remaining Quota Status
exports.getQuotaStatus = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const sub = await Subscription.findOne({ storeId });

    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscription record not found." });
    }

    const monthlyRemaining = Math.max(0, sub.monthlyBrLimit - sub.monthlyBrUsed);
    const totalAvailable = monthlyRemaining + (sub.addonBrBalance || 0);

    res.json({
      success: true,
      isActive: sub.isActive,
      expiryDate: sub.expiryDate,
      monthlyBrLimit: sub.monthlyBrLimit,
      monthlyBrUsed: sub.monthlyBrUsed,
      monthlyRemaining,
      addonBrBalance: sub.addonBrBalance || 0,
      totalAvailable
    });
  } catch (error) {
    next(error);
  }
};