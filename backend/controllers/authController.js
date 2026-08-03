const User = require('../models/User');
const Store = require('../models/Store');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, storeId) => {
  return jwt.sign({ id, role, storeId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res, next) => {
  try {
    const { storeName, ownerName, phone, email, password, address, gstin, role, storeId } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
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
        phone: phone.trim(), 
        email: email.toLowerCase().trim(), 
        address: address.trim(), 
        gstin: gstin ? gstin.trim() : '' 
      });
      assignedStoreId = store._id;
      storeInfo = store;

      // Safe Subscription creation without validation blocks
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
        console.log("Subscription Creation Notice:", subErr.message);
      }

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
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: role || 'admin',
      storeId: assignedStoreId
    });

    const token = generateToken(user._id, user.role, assignedStoreId);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      storeInfo
    });
  } catch (error) {
    console.error("REGISTRATION ERROR CRASH:", error); // <-- Yeh terminal me exact error print karega
    return res.status(500).json({ success: false, message: error.message || "Registration failed due to server error." });
  }
};

exports.addEmployee = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const storeId = req.user.storeId;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admin can add employees." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Employee email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role: 'employee',
      storeId
    });

    res.status(201).json({
      success: true,
      message: "Employee registered successfully.",
      employee: { id: employee._id, name: employee.name, email: employee.email, phone: employee.phone }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('storeId');
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const subscription = await Subscription.findOne({ storeId: user.storeId._id });
    const now = new Date();
    const isSubActive = Boolean(subscription && subscription.isActive && subscription.expiryDate && now <= new Date(subscription.expiryDate));

    const token = generateToken(user._id, user.role, user.storeId._id);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      storeInfo: {
        ...user.storeId.toObject(),
        isSubActive 
      },
      isSubActive
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
    
    const employees = await User.find({ 
      storeId: req.user.storeId, 
      role: 'employee' 
    }).select('name email phone createdAt');

    res.json({ success: true, employees });
  } catch (error) {
    next(error);
  }
};