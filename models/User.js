const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    nationalId: {
      type: String,
      required: [true, 'National ID is required'],
      unique: true,
      trim: true,
      minlength: [13, 'National ID must be at least 13 characters'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    phone: {
      type: String,
      trim: true,
    },
    faceEncodings: {
      type: [Number], // Legacy support
      select: false,
    },
    faceEmbeddings: {
      type: [{
        pose: String,
        embedding: [Number],
        createdAt: { type: Date, default: Date.now }
      }],
      select: false,
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
    profilePhoto: {
      type: String,
      default: null, // DEPRECATED: Do not use or populate this field
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'flagged', 'suspended'],
      default: 'pending'
    },
    role: {
      type: String,
      enum: ['voter', 'admin'],
      default: 'voter'
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    accountLockedUntil: {
      type: Date,
      default: null
    },
    failedFaceAttempts: {
      type: Number,
      default: 0
    },
    fraudRiskScore: {
      type: Number,
      default: 0
    },
    lastFailedFaceAttempt: {
      type: Date,
      default: null
    },
    lastSuccessfulFaceVerification: {
      type: Date,
      default: null
    },
    faceVerificationHistory: [{
      timestamp: Date,
      success: Boolean,
      reason: String,
      ipAddress: String,
      device: String,
      riskScoreChange: Number,
      confidence: Number,
      distance: Number,
      qualityScore: Number,
      matchedEmbedding: String
    }]
  },
  {
    timestamps: true,
  }
);

// Indexes are automatically created for fields with `unique: true`

module.exports = mongoose.model('User', userSchema);
