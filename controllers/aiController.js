const AIService = require('../services/AIService');
const axios = require('axios');
const Setting = require('../models/Setting');

exports.getStatus = async (req, res, next) => {
  try {
    const setting = await Setting.findOne();
    if (!setting || !setting.aiServiceUrl) {
      return res.status(404).json({ isConfigured: false, isHealthy: false });
    }
    
    try {
      const data = await AIService.testConnection(setting.aiServiceUrl);
      if (data && (data.status === 'ok' || data.status === 'healthy')) {
        return res.status(200).json({ isConfigured: true, isHealthy: true });
      } else {
        return res.status(503).json({ isConfigured: true, isHealthy: false });
      }
    } catch (err) {
      return res.status(503).json({ isConfigured: true, isHealthy: false });
    }
  } catch (error) {
    next(error);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    let baseUrl = req.body.baseUrl || req.body.url;
    console.log(`[AI Config] Incoming URL for testConnection: ${baseUrl}`);
    if (!baseUrl) {
      return res.status(400).json({ success: false, message: 'baseUrl is required' });
    }
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    console.log(`[AI Config] Sending GET request to: ${baseUrl}/health`);
    const data = await AIService.testConnection(baseUrl);
    console.log(`[AI Config] Health response body: ${JSON.stringify(data)}`);

    if (data && (data.status === 'ok' || data.status === 'healthy')) {
      return res.status(200).json({ success: true });
    } else {
      console.log(`[AI Config] Connection failed validation`);
      return res.status(400).json({ success: false, message: 'Connection failed' });
    }
  } catch (error) {
    console.error(`[AI Config] Error during testConnection:`, error.message);
    return res.status(400).json({ 
      success: false, 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Connection failed' 
    });
  }
};

exports.saveConfig = async (req, res, next) => {
  try {
    let baseUrl = req.body.baseUrl || req.body.url;
    console.log(`[AI Config] Incoming URL for saveConfig: ${baseUrl}`);
    if (!baseUrl) {
      return res.status(400).json({ success: false, message: 'baseUrl is required' });
    }
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting({ aiServiceUrl: baseUrl });
    } else {
      setting.aiServiceUrl = baseUrl;
    }
    
    if (req.user && req.user.id) {
      setting.updatedBy = req.user.id;
    }

    await setting.save();
    console.log(`[AI Config] Save result: successfully updated MongoDB Setting with URL: ${baseUrl}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[AI Config] Error during saveConfig:`, error.message);
    return res.status(400).json({ 
      success: false, 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Save failed' 
    });
  }
};
exports.registerFace = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    
    const result = await AIService.registerFace(image);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.verifyFace = async (req, res, next) => {
  try {
    const { image, stored_encoding } = req.body;
    if (!image || !stored_encoding) {
      return res.status(400).json({ success: false, message: 'Image and stored_encoding are required' });
    }
    
    const result = await AIService.verifyFace(image, stored_encoding);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.chat = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    
    const result = await AIService.chat(question);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};



exports.candidateSummary = async (req, res, next) => {
  try {
    const { manifesto } = req.body;
    if (!manifesto) {
      return res.status(400).json({ success: false, message: 'Manifesto is required' });
    }
    
    const result = await AIService.candidateSummary(manifesto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.validateEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const result = await AIService.validateEmail(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
