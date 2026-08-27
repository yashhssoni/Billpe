const express = require('express');
const router = express.Router();
const { 
  sendRegisterOTP,
  verifyRegisterOTP,
  register, 
  login, 
  addEmployee, 
  getStoreEmployees, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Registration Flow
router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/register', register); // Fallback direct register

// Auth & Employees
router.post('/login', login);
router.post('/add-employee', protect, addEmployee);
router.get('/employees', protect, getStoreEmployees);

// Password Recovery Routes (Public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;const express = require('express');
const router = express.Router();
const { 
  sendRegisterOTP,
  verifyRegisterOTP,
  register, 
  login, 
  addEmployee, 
  getStoreEmployees, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Registration Flow
router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/register', register); // Fallback direct register

// Auth & Employees
router.post('/login', login);
router.post('/add-employee', protect, addEmployee);
router.get('/employees', protect, getStoreEmployees);

// Password Recovery Routes (Public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;