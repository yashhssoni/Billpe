const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    unique: true // Ek store sirf 1 review submit kar sakta hai
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);