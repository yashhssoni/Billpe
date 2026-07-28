const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  createMonthlyOrder, 
  verifyMonthlyPayment, 
  createAddonOrder, 
  verifyAddonPayment,
  getQuotaStatus
} = require('../controllers/paymentController');

router.get('/quota-status', protect, getQuotaStatus);

// Monthly Subscription Routes
router.post('/monthly/order', protect, createMonthlyOrder);
router.post('/monthly/verify', protect, verifyMonthlyPayment);

router.post('/addon/order', protect, createAddonOrder);
router.post('/addon/verify', protect, verifyAddonPayment);

module.exports = router;