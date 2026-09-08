const express = require('express');
const router = express.Router();
const { checkout, getSalesHistory, processReturn } = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscriptionAndQuota } = require('../middleware/checkLimit');

router.post('/checkout', protect, checkSubscriptionAndQuota, checkout);
router.get('/history', protect, getSalesHistory);
router.post('/return', protect, processReturn);

module.exports = router;