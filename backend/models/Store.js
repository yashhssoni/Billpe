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
  
  overallScheduleActive: { 
    type: Boolean, 
    default: false 
  },
  scheduleStartTime: { 
    type: String, 
    default: '09:00' 
  },
  scheduleEndTime: { 
    type: String, 
    default: '21:00' 
  }

}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);