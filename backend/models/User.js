const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  resetPasswordOTP: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);