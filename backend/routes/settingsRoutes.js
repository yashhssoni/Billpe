const express = require('express');
const router = express.Router();

// Middleware jisme aapka JWT auth logic hai
const { authMiddleware } = require('../middleware/authMiddleware');

const {
  getProfileDetails,
  changePassword,
  submitReview,
  getCommunityReviews
} = require('../controllers/settingsController');

router.get('/profile', authMiddleware, getProfileDetails);
router.post('/change-password', authMiddleware, changePassword);
router.post('/reviews', authMiddleware, submitReview);
router.get('/reviews', authMiddleware, getCommunityReviews);

module.exports = router;