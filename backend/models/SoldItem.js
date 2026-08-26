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
  price: { 
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
  }
}, { timestamps: true });

module.exports = mongoose.model('SoldItem', soldItemSchema);