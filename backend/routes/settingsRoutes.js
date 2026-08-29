const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const {
  getProfileDetails,
  changePassword,
  submitReview,
  getCommunityReviews,
  updateProfileDetails
} = require('../controllers/settingsController');

router.get('/profile', protect, getProfileDetails);
router.post('/change-password', protect, changePassword);
router.post('/reviews', protect, submitReview);
router.get('/reviews', getCommunityReviews);
router.put('/profile', protect, updateProfileDetails);

module.exports = router;