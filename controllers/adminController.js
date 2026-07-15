const adminService = require('../services/adminService');
const auditService = require('../services/auditService');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers(req.query);
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find().populate('actorId', 'fullName email').sort('-createdAt');
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await adminService.getUserDetails(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const user = await adminService.suspendUser(req.params.id);
    
    await auditService.logAction({
      action: 'USER_SUSPENDED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User suspended successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const user = await adminService.verifyUser(req.params.id);
    
    await auditService.logAction({
      action: 'USER_VERIFIED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User verified successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.clearFlag = async (req, res) => {
  try {
    const user = await adminService.clearFlag(req.params.id);
    
    await auditService.logAction({
      action: 'USER_FLAG_CLEARED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User fraud flag cleared successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetFaceAttempts = async (req, res) => {
  try {
    const user = await adminService.resetFaceAttempts(req.params.id);
    
    await auditService.logAction({
      action: 'FACE_ATTEMPTS_RESET',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User failed face attempts reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resetFraudScore = async (req, res) => {
  try {
    const user = await adminService.resetFraudScore(req.params.id);
    
    await auditService.logAction({
      action: 'FRAUD_SCORE_RESET',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User fraud risk score reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const user = await adminService.activateUser(req.params.id);
    
    await auditService.logAction({
      action: 'USER_ACTIVATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User activated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await adminService.deleteUser(req.params.id);
    
    await auditService.logAction({
      action: 'USER_DELETED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: req.params.id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    
    await auditService.logAction({
      action: 'USER_ROLE_UPDATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: user._id,
      targetModel: 'User',
      details: { newRole: req.body.role },
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user, message: 'User role updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.verifyVoteReceipt = async (req, res) => {
  try {
    const Vote = require('../models/Vote');
    const vote = await Vote.findById(req.params.receiptId).populate('electionId', 'title startDate status');
    
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Receipt not found or invalid' });
    }

    res.status(200).json({
      success: true,
      data: {
        receiptId: vote._id,
        electionName: vote.electionId.title,
        electionStatus: vote.electionId.status,
        timestamp: vote.createdAt,
        isValid: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
