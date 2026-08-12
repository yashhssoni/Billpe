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
    let sub = await Subscription.findOne({ storeId });

    if (!sub) {
      sub = await Subscription.create({
        storeId,
        paymentPending: true,
        isActive: false
      });
    } else {
      sub.paymentPending = true;
      await sub.save();
    }

    res.json({ success: true, message: "Payment request sent to admin successfully." });
  } catch (error) {
    next(error);
  }
};

// Admin jab payment check karke approve karega (Postman / Admin panel se)
exports.adminApprove = async (req, res, next) => {
  try {
    const { storeId } = req.body;
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