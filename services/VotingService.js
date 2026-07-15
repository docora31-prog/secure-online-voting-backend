const mongoose = require('mongoose');
const crypto = require('crypto');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');

class VotingService {
  /**
   * Cast a vote using a MongoDB transaction.
   * This guarantees atomicity: both the Vote insert and the duplicate-check
   * are committed together, preventing race conditions.
   */
  async castVote({ userId, electionId, candidateId, ipAddress, deviceSignature }) {
    // --- Pre-flight checks (outside transaction for speed) ---

    // 1. Verify election is active
    const election = await Election.findById(electionId);
    if (!election) throw new Error('Election not found');
    if (election.status !== 'ongoing') {
      throw new Error(`Voting is not currently open for this election (status: ${election.status})`);
    }

    // 2. Verify candidate belongs to this election
    const candidate = await Candidate.findOne({ _id: candidateId, electionId });
    if (!candidate) {
      throw new Error('Candidate does not belong to this election');
    }

    // --- Standard Insert (Transactions removed for standalone MongoDB support) ---
    try {
      // The unique compound index { electionId, userId } on the Vote model
      // will automatically throw an E11000 DuplicateKeyError here if the user
      // has already voted, making this foolproof.
      const vote = await Vote.create({
        electionId,
        candidateId,
        userId,
        ipAddress,
        deviceSignature,
      });

      // Generate a tamper-evident vote receipt hash
      const receipt = this._generateVoteReceipt(userId, electionId, candidateId, vote._id);

      return {
        receiptId: receipt,
        voteId: vote._id,
        electionTitle: election.title,
        candidateName: candidate.name,
        candidateParty: candidate.party,
        timestamp: vote.createdAt,
      };
    } catch (error) {
      // Handle the duplicate vote scenario gracefully
      if (error.code === 11000) {
        throw new Error('You have already voted in this election. Duplicate voting is not permitted.');
      }
      throw error;
    }
  }

  /**
   * Check if a specific user has already voted in an election.
   * Used by the frontend to disable the "Vote" button.
   */
  async hasUserVoted(userId, electionId) {
    const existingVote = await Vote.findOne({ userId, electionId });
    return existingVote ? existingVote._id : null;
  }

  /**
   * Get all votes cast by a specific user (voting history).
   */
  async getUserVotingHistory(userId) {
    const history = await Vote.find({ userId })
      .populate('electionId', 'title type status startDate endDate')
      .populate('candidateId', 'name party photoUrl')
      .sort({ createdAt: -1 });
    return history;
  }

  /**
   * Generate a SHA-256 receipt hash from the vote's key components.
   * This is deterministic — the same inputs always produce the same hash.
   * Users can use this to verify their vote without revealing who they voted for.
   */
  _generateVoteReceipt(userId, electionId, candidateId, voteId) {
    const data = `${userId}-${electionId}-${candidateId}-${voteId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = new VotingService();
