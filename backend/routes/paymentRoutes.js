const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getQuotaStatus, requestActivation, adminApprove } = require('../controllers/paymentController');

router.get('/quota-status', protect, getQuotaStatus);
router.post('/request-activation', protect, requestActivation);
router.post('/admin-approve', adminApprove);

module.exports = router;