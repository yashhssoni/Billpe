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
  resetPassword,
  deleteEmployee, 
  updateEmployee, 
  toggleEmployeeShift, 
  getEmployeeShiftHistory
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/register', register);
router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/add-employee', protect, addEmployee);
router.get('/employees', protect, getStoreEmployees);
router.put('/employees/:id', protect, updateEmployee);
router.delete('/employees/:id', protect, deleteEmployee);

router.patch('/employees/:id/toggle-shift', protect, toggleEmployeeShift);
router.get('/employees/:employeeId/shift-history', protect, getEmployeeShiftHistory);

module.exports = router;