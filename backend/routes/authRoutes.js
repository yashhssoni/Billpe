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

router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/register', register);

router.post('/login', login);
router.post('/add-employee', protect, addEmployee);
router.get('/employees', protect, getStoreEmployees);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;