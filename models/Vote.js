const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ipAddress: {
      type: String, // Useful for audit trailing, though potentially anonymized depending on privacy laws
    },
    deviceSignature: {
      type: String, // Basic fingerprinting string (e.g., hashed user-agent)
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Prevent duplicate voting at the database level!
// A user can only have one vote document per election.
voteSchema.index({ electionId: 1, userId: 1 }, { unique: true });

// Index for efficiently counting votes per candidate in an election
voteSchema.index({ electionId: 1, candidateId: 1 });

module.exports = mongoose.model('Vote', voteSchema);
