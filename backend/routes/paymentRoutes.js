const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getQuotaStatus, 
  activateMonthlySubscription 
} = require('../controllers/paymentController');

router.get('/quota-status', protect, getQuotaStatus);
router.post('/activate-subscription', protect, activateMonthlySubscription);

module.exports = router;