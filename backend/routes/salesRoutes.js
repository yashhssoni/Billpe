const express = require('express');
const router = express.Router();
const { 
  checkout, 
  getSalesHistory, 
  processReturn,
  archiveSales,
  exportSalesRange,
  permanentDeleteRange,
  syncOfflineSales,
  getReturnableSales 
} = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscriptionAndQuota } = require('../middleware/checkLimit');

router.post('/checkout', protect, checkSubscriptionAndQuota, checkout);
router.post('/sync-offline', protect, syncOfflineSales);
router.get('/history', protect, getSalesHistory);
router.get('/returnable-lookup', protect, getReturnableSales);
router.post('/return', protect, processReturn);

router.post('/history/archive', protect, archiveSales);
router.post('/history/export-range', protect, exportSalesRange);
router.post('/history/permanent-delete-range', protect, permanentDeleteRange);

module.exports = router;