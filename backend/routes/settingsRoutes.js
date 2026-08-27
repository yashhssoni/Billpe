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

// Store & Owner Profile
router.get('/profile', protect, getProfileDetails);

// Change Password (In-app)
router.post('/change-password', protect, changePassword);

// Reviews (Submit: Protected, Get: Open/Protected)
router.post('/reviews', protect, submitReview);
router.get('/reviews', getCommunityReviews);

module.exports = router;