const User = require('../models/User');
const OTP = require('../models/OTP');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AIService = require('./AIService');

class AuthenticationService {
  
  // Register a new user
  async register(userData) {
    const tTotalStart = process.hrtime();
    console.log('[Registration] Request Received');
    const { nationalId, fullName, email, password, phone, image, images } = userData;
    
    const faceImages = images || (image ? [{pose: 'front', data: image}] : []);
    if (!faceImages || faceImages.length === 0) {
      throw new Error('Face image(s) are required for registration');
    }

    // Check for existing users to provide precise messages
    const existingNationalId = await User.findOne({ nationalId });
    if (existingNationalId) {
      throw new Error('A voter with this National ID already exists.');
    }
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new Error('A voter with this email already exists.');
    }

    // Get dynamic settings
    const setting = await Setting.findOne() || {};
    
    // Call AI Service for face registration
    let faceEmbeddings = [];
    let aiProfiling = {};
    let aiRequestMs = 0;
    try {
      const payload = {
        images: faceImages,
        minimumFaceSize: setting.minimumFaceSize,
        minimumBrightness: setting.minimumBrightness,
        maximumBrightness: setting.maximumBrightness,
        blurThreshold: setting.blurThreshold,
        modelName: setting.modelName,
        detectorBackend: setting.detectorBackend
      };
      
      const tAiStart = process.hrtime();
      const aiResult = await AIService.registerFace(payload);
      const tAiDiff = process.hrtime(tAiStart);
      aiRequestMs = (tAiDiff[0] * 1000) + (tAiDiff[1] / 1e6);
      console.log(`[Registration] AI Request Time: ${aiRequestMs.toFixed(2)}ms`);
      
      if (!aiResult || !aiResult.success) {
        throw new Error(aiResult?.message || 'Face registration failed at AI service');
      }
      faceEmbeddings = aiResult.embeddings;
      aiProfiling = aiResult.profiling || {};
    } catch (error) {
      throw new Error(error.message || 'Face registration failed at AI service');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user;
    let dbSaveMs = 0;
    try {
      const tDbStart = process.hrtime();
      user = await User.create({
        nationalId,
        fullName,
        email,
        password: hashedPassword,
        phone,
        faceEmbeddings: faceEmbeddings,
        faceRegistered: true,
        status: 'pending'
      });
      const tDbDiff = process.hrtime(tDbStart);
      dbSaveMs = (tDbDiff[0] * 1000) + (tDbDiff[1] / 1e6);
      console.log(`[Registration] Database Save Time: ${dbSaveMs.toFixed(2)}ms`);
    } catch (error) {
      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.nationalId) {
          throw new Error('A voter with this National ID already exists.');
        } else if (error.keyPattern && error.keyPattern.email) {
          throw new Error('A voter with this email already exists.');
        }
      }
      throw error;
    }

    const tTotalDiff = process.hrtime(tTotalStart);
    const totalRegistrationMs = (tTotalDiff[0] * 1000) + (tTotalDiff[1] / 1e6);
    console.log(`[Registration] Total Registration Time: ${totalRegistrationMs.toFixed(2)}ms`);

    return { 
      user: {
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role || 'voter',
        nationalId: user.nationalId,
        status: user.status,
        phone: user.phone,
        faceRegistered: user.faceRegistered
      },
      profiling: {
        ...aiProfiling,
        ai_roundtrip_ms: parseFloat(aiRequestMs.toFixed(2)),
        mongo_save_ms: parseFloat(dbSaveMs.toFixed(2)),
        total_registration_ms: parseFloat(totalRegistrationMs.toFixed(2))
      }
    };
  }

  // Login
  async login(email, password, image, isAdminLogin = false, ipAddress = 'unknown', device = 'unknown') {
    const user = await User.findOne({ email }).select('+password +faceEncodings +faceEmbeddings +role +failedLoginAttempts +accountLockedUntil +status +isActive +isVerified');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (isAdminLogin && user.role !== 'admin') {
      throw new Error('Access denied. This portal is only for administrators.');
    }

    if (user.role === 'admin') {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = null;
        await user.save();
      }

      return this.generateTokens(user);
    }

    // Voter Login Flow
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const error = new Error('Maximum login attempts exceeded. Your account has been temporarily locked.');
      error.isLocked = true;
      throw error;
    } else if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();
    }

    const setting = await Setting.findOne() || { maximumLoginAttempts: 5, accountLockDurationMinutes: 15 };
    const maxAttempts = setting.maximumLoginAttempts || 5;
    const lockDuration = setting.accountLockDurationMinutes || 15;
    const maxFaceAttempts = setting.maxFaceVerificationAttempts ?? 3;
    const faceRiskInc = setting.faceVerificationRiskIncrement ?? 20;
    const scoreThreshold = setting.fraudScoreThreshold ?? 60;

    if (user.status === 'suspended') {
      throw new Error('Your account has been suspended.');
    }

    if (user.status === 'pending') {
      const error = new Error('Your account is awaiting administrator approval. Please wait until an administrator approves your registration.');
      error.isPendingApproval = true;
      throw error;
    }

    if (user.isFlagged || user.status === 'flagged') {
      throw new Error('Your account is under review.');
    }
    
    if (!user.isActive) {
      throw new Error('Your account has been disabled. Please contact the administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= maxAttempts) {
        user.accountLockedUntil = new Date(Date.now() + lockDuration * 60000);
        await user.save();
        const error = new Error('Maximum login attempts exceeded. Your account has been temporarily locked.');
        error.isLocked = true;
        throw error;
      }
      await user.save();
      throw new Error('Invalid credentials');
    }

    if (!image) {
      throw new Error('Face image is required for 2FA verification');
    }

    const faceVerifier = require('./FaceVerificationService');
    const verifyResult = await faceVerifier.verifyUserFace(user, image, setting, ipAddress, device);
    
    if (!verifyResult.success) {
      const error = new Error(verifyResult.message);
      error.isFaceVerificationFailure = true;
      error.payload = {
        success: false,
        verified: false,
        failedAttempts: verifyResult.failedAttempts,
        remainingAttempts: verifyResult.remainingAttempts,
        fraudRiskScore: verifyResult.fraudRiskScore,
        isFlagged: verifyResult.isFlagged,
        message: verifyResult.message
      };
      throw error;
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    return this.generateTokens(user);
  }

  // Refresh Token
  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error('User not found');
      
      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Generate Tokens (Access & Refresh)
  generateTokens(user) {
    const payload = { id: user._id, role: user.role || 'voter' };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });
    
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    return { 
      accessToken, 
      refreshToken, 
      user: { 
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role || 'voter',
        nationalId: user.nationalId,
        status: user.status,
        phone: user.phone,
        faceRegistered: user.faceRegistered,
        profilePhoto: user.profilePhoto
      } 
    };
  }

  // Forgot Password
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('No user found with this email');
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await OTP.create({
      email,
      otpCode,
      purpose: 'password_reset',
      expiresAt
    });

    // In a real app, send email here
    return otpCode; // Return for testing/demo purposes
  }

  // Verify OTP
  async verifyOTP(email, otpCode, purpose) {
    const otpRecord = await OTP.findOne({
      email,
      otpCode,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    otpRecord.isUsed = true;
    await otpRecord.save();
    return true;
  }

  // Reset Password
  async resetPassword(email, otpCode, newPassword) {
    // Verify OTP first
    await this.verifyOTP(email, otpCode, 'password_reset');

    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return true;
  }
}

module.exports = new AuthenticationService();
