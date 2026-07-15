const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: [true, 'Candidate must be associated with an election'],
    },
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
    },
    party: {
      type: String,
      required: [true, 'Political party is required'],
      trim: true,
    },
    age: {
      type: Number,
      min: [18, 'Candidate must be at least 18 years old'],
    },
    education: String,
    experience: String,
    bio: String,
    photoUrl: String, // Path to uploaded photo
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch all candidates for a specific election
candidateSchema.index({ electionId: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
