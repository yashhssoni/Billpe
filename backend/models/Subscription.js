const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
  expiryDate: { type: Date, required: false }, // <-- required: false kiya gaya hai
  monthlyBrLimit: { type: Number, default: 200 },
  monthlyBrUsed: { type: Number, default: 0 },
  addonBrBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);