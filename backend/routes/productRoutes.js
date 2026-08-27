const express = require('express');
const router = express.Router();
const { addProduct, getProducts, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscriptionAndQuota } = require('../middleware/checkLimit');

router.post('/deduct-quota', protect, checkSubscriptionAndQuota, (req, res) => {
  res.json({ success: true, message: "Quota verified and deducted successfully." });
});

router.route('/')
  .post(protect, checkSubscriptionAndQuota, addProduct)
  .get(protect, getProducts);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;