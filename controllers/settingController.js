const Setting = require('../models/Setting');
const axios = require('axios');



exports.getAiUrl = async (req, res) => {
  try {
    const setting = await Setting.findOne();
    if (!setting || !setting.aiServiceUrl) {
      return res.status(404).json({
        success: false,
        message: 'AI Service URL is not configured.'
      });
    }
    
    try {
      const AIService = require('../services/AIService');
      const data = await AIService.testConnection(setting.aiServiceUrl);
      if (!data || (data.status !== 'healthy' && data.status !== 'ok')) {
        return res.status(503).json({ success: false, message: 'AI Service is unreachable.' });
      }
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI Service is unreachable.' });
    }

    res.status(200).json({ success: true, data: { aiServiceUrl: setting.aiServiceUrl, updatedAt: setting.updatedAt } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateAiUrl = async (req, res) => {
  try {
    let { url } = req.body;
    
    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({ success: false, message: 'Invalid AI Service URL.' });
    }
    if (url.endsWith('/')) url = url.slice(0, -1);

    let setting = await Setting.findOne();
    
    // Verify the new URL works before saving
    try {
      const AIService = require('../services/AIService');
      const data = await AIService.testConnection(url);
      if (!data || (data.status !== 'healthy' && data.status !== 'ok')) {
        return res.status(400).json({ success: false, message: 'New AI Service URL is unreachable or invalid.' });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: 'New AI Service URL is unreachable or invalid.' });
    }

    // Save URL
    if (!setting) {
      setting = new Setting({
        aiServiceUrl: url,
        updatedBy: req.user.id
      });
    } else {
      setting.aiServiceUrl = url;
      setting.updatedBy = req.user.id;
    }
    await setting.save();

    res.status(200).json({ success: true, data: { aiServiceUrl: setting.aiServiceUrl, updatedAt: setting.updatedAt } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.testConnection = async (req, res) => {
  try {
    let { url } = req.body;
    
    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({ success: false, message: 'Connection Failed' });
    }
    
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    const AIService = require('../services/AIService');
    const data = await AIService.testConnection(url);
    
    if (data && (data.status === 'healthy' || data.status === 'ok')) {
      return res.status(200).json({ success: true, message: 'Connected Successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Connection Failed' });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Connection Failed' });
  }
};

exports.getGeneralSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting({ aiServiceUrl: 'https://api.example.com' });
      await setting.save();
    }
    res.status(200).json({
      success: true,
      data: {
        maximumLoginAttempts: setting.maximumLoginAttempts,
        accountLockDurationMinutes: setting.accountLockDurationMinutes,
        maxFaceVerificationAttempts: setting.maxFaceVerificationAttempts,
        faceVerificationRiskIncrement: setting.faceVerificationRiskIncrement,
        fraudScoreThreshold: setting.fraudScoreThreshold,
        verificationThreshold: setting.verificationThreshold,
        minimumFaceSize: setting.minimumFaceSize,
        minimumBrightness: setting.minimumBrightness,
        maximumBrightness: setting.maximumBrightness,
        blurThreshold: setting.blurThreshold,
        distanceMetric: setting.distanceMetric,
        modelName: setting.modelName,
        detectorBackend: setting.detectorBackend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateGeneralSettings = async (req, res) => {
  try {
    const fields = ['maximumLoginAttempts', 'accountLockDurationMinutes', 'maxFaceVerificationAttempts', 'faceVerificationRiskIncrement', 'fraudScoreThreshold', 'verificationThreshold', 'minimumFaceSize', 'minimumBrightness', 'maximumBrightness', 'blurThreshold', 'distanceMetric', 'modelName', 'detectorBackend'];
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting({
        aiServiceUrl: 'https://api.example.com',
        updatedBy: req.user.id
      });
      fields.forEach(f => {
        if (req.body[f] !== undefined) setting[f] = req.body[f];
      });
    } else {
      fields.forEach(f => {
        if (req.body[f] !== undefined) setting[f] = req.body[f];
      });
      setting.updatedBy = req.user.id;
    }
    await setting.save();
    res.status(200).json({
      success: true,
      data: {
        maximumLoginAttempts: setting.maximumLoginAttempts,
        accountLockDurationMinutes: setting.accountLockDurationMinutes,
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
