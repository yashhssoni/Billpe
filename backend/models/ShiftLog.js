const mongoose = require('mongoose');

const shiftLogSchema = new mongoose.Schema({
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    required: true 
},
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
},
  date: {
     type: String,
      required: true
     }, 
  mode: { 
    type: String, 
    enum: ['Manual', 'Overall Schedule'], 
    default: 'Manual' },
  enabledAt: { 
    type: Date, 
    required: true
 },
  disabledAt: { 
    type: Date,
     default: null 
    },
  totalActiveMinutes: { 
    type: Number, 
    default: 0 
}
}, { timestamps: true });

module.exports = mongoose.model('ShiftLog', shiftLogSchema);