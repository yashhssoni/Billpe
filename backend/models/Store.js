const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  
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
  
  phone: { 
    type: String, 
    required: true, 
    trim: true 
    
  },
  
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
    
  },
  
  address: { 
    type: String, 
    required: true 
    
  },
  
  gstin: { 
    type: String, 
    default: '' 
    
  },
   
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);