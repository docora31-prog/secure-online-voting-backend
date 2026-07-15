const Candidate = require('../models/Candidate');
const Election = require('../models/Election');

class CandidateService {
  /**
   * Add a candidate to a specific election.
   * Validates the target election exists and is not yet completed.
   */
  async addCandidate(data) {
    // Verify the election exists and is still editable
    const election = await Election.findById(data.electionId);
    if (!election) throw new Error('Target election not found');
    if (['completed', 'cancelled'].includes(election.status)) {
      throw new Error(`Cannot add candidates to a ${election.status} election`);
    }

    const candidate = await Candidate.create(data);
    return candidate;
  }

  /**
   * Get all candidates across all elections
   */
  async getAllCandidates(filters = {}) {
    const candidates = await Candidate.find(filters)
      .populate('electionId', 'title status')
      .sort({ name: 1 });
    return candidates;
  }

  /**
   * Get all candidates for a specific election
   */
  async getCandidatesByElection(electionId) {
    const candidates = await Candidate.find({ electionId }).sort({ name: 1 });
    return candidates;
  }

  /**
   * Get a single candidate by ID
   */
  async getCandidateById(candidateId) {
    const candidate = await Candidate.findById(candidateId).populate('electionId', 'title status');
    if (!candidate) throw new Error('Candidate not found');
    return candidate;
  }

  /**
   * Update candidate profile
   */
  async updateCandidate(candidateId, data) {
    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!candidate) throw new Error('Candidate not found');
    return candidate;
  }

  /**
   * Delete a candidate. Prevents deletion if votes have already been cast for them.
   */
  async deleteCandidate(candidateId) {
    const Vote = require('../models/Vote');
    const voteCount = await Vote.countDocuments({ candidateId });
    if (voteCount > 0) {
      throw new Error('Cannot delete a candidate who has already received votes');
    }
    const candidate = await Candidate.findByIdAndDelete(candidateId);
    if (!candidate) throw new Error('Candidate not found');
    return true;
  }
}

module.exports = new CandidateService();
