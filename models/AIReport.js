const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['face_registration', 'face_verification'],
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true, // E.g., 0.95 (95% confidence)
    },
    isMatch: {
      type: Boolean,
      required: true,
    },
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed, // The raw JSON payload from Google Colab / Flask API
    },
    reviewedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

aiReportSchema.index({ userId: 1 });
aiReportSchema.index({ isMatch: 1 }); // Useful for filtering failed authentications

module.exports = mongoose.model('AIReport', aiReportSchema);
