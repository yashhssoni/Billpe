const User = require('../models/User');
const Store = require('../models/Store');
const Subscription = require('../models/Subscription');
const ShiftLog = require('../models/ShiftLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendRegistrationOtpEmail } = require('../utils/emailService');

const pendingRegistrations = new Map();

const generateToken = (id, role, storeId) => {
  return jwt.sign({ id, role, storeId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Helper to format total minutes into Exact Hours & Minutes
const formatHoursAndMinutes = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return "0 Hours 0 Minutes";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Hours ${minutes} Minutes`;
};

exports.sendRegisterOTP = async (req, res) => {
  try {
    const { storeName, ownerName, phone, email, password, address, gstin, role, storeId } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const normalizedPhone = phone ? phone.trim() : '';

    if (!normalizedEmail || !password || !normalizedPhone || !ownerName) {
      return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    if (role === 'admin' && (!storeName || !address)) {
      return res.status(400).json({ success: false, message: "Store Name & Address required for registration." });
    }

    if (role === 'employee' && !storeId) {
      return res.status(400).json({ success: false, message: "Store ID required for employee registration." });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "Email" : "Phone number";
      return res.status(400).json({ success: false, message: `${field} is already registered.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    pendingRegistrations.set(normalizedEmail, {
      payload: { storeName, ownerName, phone: normalizedPhone, email: normalizedEmail, password, address, gstin, role, storeId },
      hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    await sendRegistrationOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent to your email successfully."
    });
  } catch (error) {
    console.error("SEND REG OTP ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send verification OTP." });
  }
};

exports.verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    const pending = pendingRegistrations.get(normalizedEmail);
    if (!pending) {
      return res.status(400).json({ success: false, message: "No registration in progress or session expired. Please register again." });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const hashedInputOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (hashedInputOtp !== pending.hashedOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP entered." });
    }

    const { storeName, ownerName, phone, password, address, gstin, role, storeId } = pending.payload;

    let assignedStoreId = storeId;
    let storeInfo = null;

    if (role === 'admin') {
      const store = await Store.create({ 
        storeName: storeName.trim(), 
        ownerName: ownerName.trim(), 
        phone, 
        email: normalizedEmail, 
        address: address.trim(), 
        gstin: gstin ? gstin.trim() : '' 
      });
      assignedStoreId = store._id;
      storeInfo = store;

      try {
        await Subscription.create({
          storeId: store._id,
          expiryDate: new Date(),
          monthlyBrLimit: 200,
          monthlyBrUsed: 0,
          addonBrBalance: 0,
          isActive: false
        });
      } catch (subErr) {
        console.log("Subscription Notice:", subErr.message);
      }
    } else {
      storeInfo = await Store.findById(storeId);
      if (!storeInfo) {
        return res.status(404).json({ success: false, message: "Invalid Store ID. Store not found." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: ownerName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: role || 'admin',
      storeId: assignedStoreId,
      isShiftEnabled: true
    });

    pendingRegistrations.delete(normalizedEmail);

    const token = generateToken(user._id, user.role, assignedStoreId);

    return res.status(201).json({
      success: true,
      message: "Account verified and registered successfully!",
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isShiftEnabled: user.isShiftEnabled },
      storeInfo
    });
  } catch (error) {
    console.error("VERIFY REG ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Registration verification failed." });
  }
};

exports.register = async (req, res, next) => {
  try {
    const { storeName, ownerName, phone, email, password, address, gstin, role, storeId } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const normalizedPhone = phone ? phone.trim() : '';

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "Email" : "Phone number";
      return res.status(400).json({ success: false, message: `${field} is already registered.` });
    }

    let assignedStoreId = storeId;
    let storeInfo = null;

    if (role === 'admin') {
      if (!storeName || !address) {
        return res.status(400).json({ success: false, message: "Store Name and Address are required for admin registration." });
      }

      const store = await Store.create({ 
        storeName: storeName.trim(), 
        ownerName: ownerName.trim(), 
        phone: normalizedPhone, 
        email: normalizedEmail, 
        address: address.trim(), 
        gstin: gstin ? gstin.trim() : '' 
      });
      assignedStoreId = store._id;
      storeInfo = store;

      try {
        await Subscription.create({
          storeId: store._id,
          expiryDate: new Date(),
          monthlyBrLimit: 200,
          monthlyBrUsed: 0,
          addonBrBalance: 0,
          isActive: false
        });
      } catch (subErr) {}
    } else {
      if (!storeId) {
        return res.status(400).json({ success: false, message: "Store ID is required for employee registration." });
      }
      storeInfo = await Store.findById(storeId);
      if (!storeInfo) {
        return res.status(404).json({ success: false, message: "Invalid Store ID. Store not found." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: ownerName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      role: role || 'admin',
      storeId: assignedStoreId,
      isShiftEnabled: true
    });

    const token = generateToken(user._id, user.role, assignedStoreId);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isShiftEnabled: user.isShiftEnabled },
      storeInfo
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Registration failed." });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = (identifier || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: "Please provide Email/Mobile and Password." });
    }

    const cleanEmail = loginIdentifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: loginIdentifier }]
    }).populate('storeId');

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid Email/Mobile or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid Email/Mobile or password." });
    }

    const subscription = await Subscription.findOne({ storeId: user.storeId?._id });
    const now = new Date();
    const isSubActive = Boolean(subscription && subscription.isActive && subscription.expiryDate && now <= new Date(subscription.expiryDate));

    const token = generateToken(user._id, user.role, user.storeId?._id);

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isShiftEnabled: user.isShiftEnabled },
      storeInfo: {
        ...(user.storeId ? user.storeId.toObject() : {}),
        isSubActive 
      },
      isSubActive
    });
  } catch (error) {
    next(error);
  }
};

exports.addEmployee = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const storeId = req.user.storeId;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can add employees." });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const normalizedPhone = phone ? phone.trim() : '';

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "Email" : "Phone number";
      return res.status(400).json({ success: false, message: `Employee with this ${field} already exists.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      role: 'employee',
      storeId,
      isShiftEnabled: true
    });

    res.status(201).json({
      success: true,
      message: "Employee registered successfully.",
      employee: { id: employee._id, name: employee.name, email: employee.email, phone: employee.phone, isShiftEnabled: employee.isShiftEnabled }
    });
  } catch (error) {
    next(error);
  }
};

exports.getStoreEmployees = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can view employees." });
    }
    
    const store = await Store.findById(req.user.storeId);
    const employees = await User.find({ 
      storeId: req.user.storeId, 
      role: 'employee' 
    }).select('name email phone isShiftEnabled createdAt');

    res.json({ 
      success: true, 
      employees,
      storeSchedule: {
        active: store?.overallScheduleActive || false,
        start: store?.scheduleStartTime || '09:00',
        end: store?.scheduleEndTime || '21:00'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStoreSchedule = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can update store schedule." });
    }

    const { overallScheduleActive, scheduleStartTime, scheduleEndTime } = req.body;
    const store = await Store.findById(req.user.storeId);
    
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found." });
    }

    if (overallScheduleActive !== undefined) store.overallScheduleActive = overallScheduleActive;
    if (scheduleStartTime) store.scheduleStartTime = scheduleStartTime;
    if (scheduleEndTime) store.scheduleEndTime = scheduleEndTime;

    await store.save();

    res.json({ success: true, message: "Store schedule updated successfully.", store });
  } catch (error) {
    next(error);
  }
};

exports.toggleEmployeeShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can toggle employee shifts." });
    }

    const { id } = req.params;
    const { enable } = req.body; // true or false
    const employee = await User.findOne({ _id: id, storeId: req.user.storeId, role: 'employee' });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    employee.isShiftEnabled = enable;
    employee.shiftMode = 'manual';
    await employee.save();

    if (enable) {
      // Start a new Shift Log entry for today
      await ShiftLog.create({
        storeId: req.user.storeId,
        employeeId: employee._id,
        date: dateStr,
        mode: 'Manual',
        enabledAt: now
      });
    } else {
      // Close the active open Shift Log entry for today
      const activeLog = await ShiftLog.findOne({
        employeeId: employee._id,
        date: dateStr,
        disabledAt: null
      }).sort({ createdAt: -1 });

      if (activeLog) {
        activeLog.disabledAt = now;
        const diffMs = now - new Date(activeLog.enabledAt);
        const diffMins = Math.floor(diffMs / (1000 * 60));
        activeLog.totalActiveMinutes = diffMins;
        await activeLog.save();
      }
    }

    res.json({ success: true, message: `Employee shift ${enable ? 'enabled' : 'disabled'} successfully.`, employee });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeShiftHistory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can view shift history." });
    }

    const { employeeId } = req.params;
    const logs = await ShiftLog.find({ storeId: req.user.storeId, employeeId }).sort({ createdAt: -1 });

    const formattedLogs = logs.map(log => ({
      _id: log._id,
      date: log.date,
      mode: log.mode,
      enabledAt: log.enabledAt ? new Date(log.enabledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      disabledAt: log.disabledAt ? new Date(log.disabledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active Now',
      formattedDuration: formatHoursAndMinutes(log.totalActiveMinutes)
    }));

    res.json({ success: true, history: formattedLogs });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please enter your registered email." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "User with this email does not exist." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP has been sent to your email."
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send reset email." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide email, OTP, and new password." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedOTP = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOTP: hashedOTP,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in."
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to reset password." });
  }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can delete employees." });
    }

    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, storeId: req.user.storeId, role: 'employee' });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    res.json({ success: true, message: "Employee removed successfully." });
  } catch (error) {
    next(error);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can edit employees." });
    }

    const { id } = req.params;
    const { name, email, phone } = req.body;

    const employee = await User.findOne({ _id: id, storeId: req.user.storeId, role: 'employee' });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    if (name) employee.name = name.trim();
    if (email) employee.email = email.toLowerCase().trim();
    if (phone) employee.phone = phone.trim();

    await employee.save();

    res.json({ success: true, message: "Employee updated successfully.", employee });
  } catch (error) {
    next(error);
  }
};