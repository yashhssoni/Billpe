const express = require('express');
const router = express.Router();

// protect middleware import
const { protect } = require('../middleware/authMiddleware');

const {
  getProfileDetails,
  changePassword,
  submitReview,
  getCommunityReviews
} = require('../controllers/settingsController');

router.get('/profile', protect, getProfileDetails);
router.post('/change-password', protect, changePassword);
router.post('/reviews', protect, submitReview);
router.get('/reviews', getCommunityReviews);

module.exports = router;