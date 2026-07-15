const User = require('../models/User');
const Vote = require('../models/Vote');
const bcrypt = require('bcryptjs');

class UserService {
  async getUserProfile(userId) {
    const user = await User.findById(userId).select('-__v');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateProfile(userId, updateData) {
    // Only allow specific fields to be updated
    const allowedUpdates = {};
    if (updateData.fullName) allowedUpdates.fullName = updateData.fullName;
    if (updateData.phone) allowedUpdates.phone = updateData.phone;
    if (updateData.faceEncodings) allowedUpdates.faceEncodings = updateData.faceEncodings;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return true;
  }

  async getVotingHistory(userId) {
    // Fetch all votes cast by this user and populate election and candidate details
    const history = await Vote.find({ userId })
      .populate('electionId', 'title type date status')
      .populate('candidateId', 'name party')
      .sort({ createdAt: -1 });
    
    return history;
  }
}

module.exports = new UserService();
