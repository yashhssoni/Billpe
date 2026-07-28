const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  storeId: {
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Store', 
     required: true 
    },
  productName: {
     type: String, 
     required: true, 
     trim: true 
    },
  barcode: { 
    type: String, 
    required: true, 
    index: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  stock: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 
    1},
  category: { type: String, default: 'General', trim: true },
  
  // Rates & Details
  lowestRate: { type: Number, min: 0 },
  highestRate: { type: Number, min: 0 },
  color: { type: String, trim: true },
  description: { type: String, trim: true },
  weightKg: { type: Number, min: 0, default: 0 },
  weightGrams: { type: Number, min: 0, default: 0 },
  totalWeightKg: { type: Number, min: 0, default: 0 },
  imageUri: { type: String },

  // Strict Single-Item Lifecycle Tracking
  sold: { type: Boolean, default: false },
  soldPrice: { type: Number, default: null },
  soldCustomerName: { type: String, default: '' },
  soldCustomerPhone: { type: String, default: '' },
  soldAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);