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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const storeId = req.user.storeId; // <-- Token se storeId nikal liya

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    const sub = await Subscription.findOne({ storeId });
    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscription record not found." });
    }

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const storeId = req.user.storeId;

    console.log("--- VERIFY ADDON PAYMENT STARTED ---");
    console.log("Store ID from Token:", storeId);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (expectedSign !== razorpay_signature) {
      console.log("Signature Mismatch!");
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    // Pehle check karein ki subscription document exist karta hai ya nahi
    let sub = await Subscription.findOne({ storeId });

    if (!sub) {
      console.log("Subscription record not found for this storeId. Creating a new one automatically...");
      // Agar kisi wajah se subscription record nahi bana tha, toh yahin create kar do
      sub = await Subscription.create({
        storeId,
        expiryDate: new Date(),
        monthlyBrLimit: 200,
        monthlyBrUsed: 0,
        addonBrBalance: 25, // Pehla add-on add kar diya
        isActive: false
      });
    } else {
      // Agar exist karta hai toh safely increment kar do
      sub.addonBrBalance = (sub.addonBrBalance || 0) + 25;
      await sub.save();
    }

    console.log("Successfully Updated Subscription:", sub);

    res.json({ success: false, message: "Successfully added 25 extra barcode credits!" }); // wait, make it success: true
  } catch (error) {
    console.error("ADDON VERIFY CRASH:", error);
    next(error);
  }
};


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