const userService = require('../services/userService');
const auditService = require('../services/auditService');

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    
    await auditService.logAction({
      action: 'PROFILE_UPDATED',
      actorId: req.user.id,
      actorModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, currentPassword, newPassword);

    await auditService.logAction({
      action: 'PASSWORD_CHANGED',
      actorId: req.user.id,
      actorModel: 'User',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVotingHistory = async (req, res) => {
  try {
    const history = await userService.getVotingHistory(req.user.id);
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.uploadProfileImage = async (req, res) => {
  // Placeholder: Real implementation will use Multer to upload to S3 / local disk
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    // const photoUrl = `/uploads/${req.file.filename}`;
    // await userService.updateProfile(req.user.id, { photoUrl });
    
    res.status(200).json({ success: true, message: 'Profile image uploaded successfully (MOCK)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
