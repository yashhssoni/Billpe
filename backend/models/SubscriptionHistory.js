const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  planName: { type: String, default: 'Monthly Plan (₹600)' },
  amount: { type: Number, default: 600 },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);