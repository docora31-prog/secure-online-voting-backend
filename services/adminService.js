const User = require('../models/User');

class AdminService {
  async getAllUsers(query = {}) {
    // Pagination could be added here
    return await User.find(query).select('-__v').sort({ createdAt: -1 });
  }

  async getUserDetails(userId) {
    const user = await User.findById(userId).select('-__v');
    if (!user) throw new Error('User not found');
    return user;
  }

  async suspendUser(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { isActive: false, status: 'suspended' }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async verifyUser(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { isVerified: true, status: 'verified' }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async clearFlag(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { isFlagged: false, status: 'verified', flagReason: null }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async resetFaceAttempts(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { failedFaceAttempts: 0 }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async resetFraudScore(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { fraudRiskScore: 0 }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async activateUser(userId) {
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: 'admin' } }, { isActive: true, status: 'verified' }, { new: true });
    if (!user) throw new Error('User not found or cannot perform this action on an administrator');
    return user;
  }

  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new Error('User not found');
    return true;
  }

  async updateUserRole(userId, role) {
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) throw new Error('User not found');
    return user;
  }
}

module.exports = new AdminService();
