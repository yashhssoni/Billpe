const mongoose = require('mongoose');

const soldItemSchema = new mongoose.Schema({
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  productName: { 
    type: String, 
    required: true 
  },
  barcode: {
    type: String,
    required: true
  },
  invoiceNo: {
    type: String,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  returnedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  price: { 
    type: Number, 
    required: true 
  },
  totalAmount: {
    type: Number,
    required: true
  },
  customerName: { 
    type: String, 
    default: 'N/A' 
  },
  customerPhone: { 
    type: String, 
    default: 'N/A' 
  },
  customerAddress: {
    type: String,
    default: 'N/A'
  },
  soldBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  soldByName: { 
    type: String, 
    default: 'Employee' 
  },
  paymentMode: { 
    type: String, 
    default: 'Cash' 
  },
  cashAmount: {
    type: Number,
    default: 0
  },
  onlineAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('SoldItem', soldItemSchema);