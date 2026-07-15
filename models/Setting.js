const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  aiServiceUrl: {
    type: String,
    required: true,
  },
  maximumLoginAttempts: {
    type: Number,
    default: 5
  },
  maxRequestsPerMinute: {
    type: Number,
    default: 10
  },
  minimumRequestInterval: {
    type: Number,
    default: 2
  },
  accountLockDurationMinutes: {
    type: Number,
    default: 15
  },
  maxFaceVerificationAttempts: {
    type: Number,
    default: 3
  },
  faceVerificationRiskIncrement: {
    type: Number,
    default: 20
  },
  fraudScoreThreshold: {
    type: Number,
    default: 60
  },
  verificationThreshold: { type: Number, default: 0.68 },
  qualityThreshold: { type: Number, default: 8.0 },
  minimumFaceSize: { type: Number, default: 100 },
  maximumFacesAllowed: { type: Number, default: 1 },
  minimumBrightness: { type: Number, default: 50 },
  maximumBrightness: { type: Number, default: 200 },
  blurThreshold: { type: Number, default: 100 },
  distanceMetric: { type: String, default: 'cosine' },
  modelName: { type: String, default: 'ArcFace' },
  detectorBackend: { type: String, default: 'retinaface' },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt
});

module.exports = mongoose.model('Setting', settingSchema);
