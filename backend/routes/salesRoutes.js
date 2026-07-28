const express = require('express');
const router = express.Router();
const { checkout, getSalesHistory } = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscriptionAndQuota } = require('../middleware/checkLimit');

router.post('/checkout', protect, checkSubscriptionAndQuota, checkout);
router.get('/history', protect, getSalesHistory);

module.exports = router;