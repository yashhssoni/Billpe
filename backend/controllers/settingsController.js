const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Store = require('../models/Store');
const Review = require('../models/Review');

exports.getProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const store = await Store.findById(user.storeId);
    const existingReview = await Review.findOne({ storeId: user.storeId });

    return res.status(200).json({
      success: true,
      data: {
        ownerName: user.name || user.ownerName || 'Store Owner',
        email: user.email,
        phone: user.phone || user.mobile || 'N/A',
        storeName: store?.storeName || 'My Store',
        storeAddress: store?.address || 'N/A',
        storeId: store?._id,
        subscriptionStatus: store?.subscriptionStatus || 'Active',
        hasReviewed: Boolean(existingReview)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update password' });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { rating, comment } = req.body;

    if (!rating || !comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const store = await Store.findById(user.storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const review = await Review.findOneAndUpdate(
      { storeId: store._id },
      {
        storeId: store._id,
        storeName: store.storeName,
        ownerName: user.name || 'Owner',
        rating: Number(rating),
        comment: comment.trim(),
        isApproved: true
      },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error submitting review' });
  }
};

exports.getCommunityReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(25);

    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error loading reviews' });
  }
};
exports.updateProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { ownerName, phone, email } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (phone && phone.trim() !== user.phone) {
      const phoneExists = await User.findOne({ phone: phone.trim() });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
      user.phone = phone.trim();
    }

    if (ownerName) {
      user.name = ownerName.trim();
      if (user.storeId) {
        await Store.findByIdAndUpdate(user.storeId, { ownerName: ownerName.trim() });
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        ownerName: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error updating profile' });
  }
};