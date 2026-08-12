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
      paymentPending: sub?.paymentPending || false,
      expiryDate: sub?.expiryDate || null
    });
  } catch (error) {
    next(error);
  }
};

// Dukaandaar jab payment ke baad "Notify Admin" dabayega
exports.requestActivation = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;

    // upsert: true se agar record nahi hoga toh ban jayega, crash nahi hoga!
    await Subscription.findOneAndUpdate(
      { storeId },
      { paymentPending: true, isActive: false },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Payment request sent to admin successfully." });
  } catch (error) {
    next(error);
  }
};

// Admin jab payment check karke approve karega (Postman / Admin panel se)
exports.adminApprove = async (req, res, next) => {
  try {
    const { storeId } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Store ID is required." });
    }

    let sub = await Subscription.findOne({ storeId });

    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscription record not found for this store." });
    }

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1); // Exact 1 Month extension

    sub.expiryDate = newExpiry;
    sub.isActive = true;
    sub.paymentPending = false; // Pending hata diya
    await sub.save();

    res.json({ success: true, message: "Subscription approved and activated successfully for 1 month!" });
  } catch (error) {
    next(error);
  }
};