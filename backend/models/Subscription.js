const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
  expiryDate: { type: Date, required: false },
  isActive: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);