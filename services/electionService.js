const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');

class ElectionService {
  /**
   * Create a new election (Admin only)
   */
  async createElection(data, adminId) {
    const election = await Election.create({
      ...data,
      createdBy: adminId,
    });
    return election;
  }

  /**
   * Get all elections. Voters see all; Admins can filter by any status.
   */
  async getAllElections(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    const elections = await Election.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ startDate: -1 });

    return elections;
  }

  /**
   * Get a single election by ID
   */
  async getElectionById(electionId) {
    const election = await Election.findById(electionId).populate('createdBy', 'fullName email');
    if (!election) throw new Error('Election not found');
    return election;
  }

  /**
   * Update election details. Prevents editing a completed/cancelled election.
   */
  async updateElection(electionId, data) {
    const election = await Election.findById(electionId);
    if (!election) throw new Error('Election not found');

    if (['completed', 'cancelled'].includes(election.status)) {
      throw new Error(`Cannot update an election that is already ${election.status}`);
    }

    const updatedElection = await Election.findByIdAndUpdate(
      electionId,
      { $set: data },
      { new: true, runValidators: true }
    );
    return updatedElection;
  }

  /**
   * Delete an election. Only allowed if there are no votes cast yet.
   */
  async deleteElection(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new Error('Election not found');

    // Safety check: do not delete if votes exist
    const voteCount = await Vote.countDocuments({ electionId });
    if (voteCount > 0) {
      throw new Error('Cannot delete an election that already has votes cast. Cancel it instead.');
    }

    // Cascade delete candidates associated with this election
    await Candidate.deleteMany({ electionId });
    await Election.findByIdAndDelete(electionId);
    return true;
  }

  /**
   * Set election status to 'ongoing'
   */
  async activateElection(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new Error('Election not found');
    if (election.status !== 'upcoming') {
      throw new Error(`Cannot activate an election with status: ${election.status}`);
    }

    election.status = 'ongoing';
    await election.save();
    return election;
  }

  /**
   * Set election status to 'completed'
   */
  async closeElection(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new Error('Election not found');
    if (election.status !== 'ongoing') {
      throw new Error(`Cannot close an election with status: ${election.status}`);
    }

    election.status = 'completed';
    await election.save();
    return election;
  }

  /**
   * Get real-time election results using MongoDB aggregation.
   * Groups votes by candidateId and counts them.
   */
  async getElectionResults(electionId) {
    const election = await this.getElectionById(electionId);

    const results = await Vote.aggregate([
      { $match: { electionId: election._id } },
      {
        $group: {
          _id: '$candidateId',
          voteCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'candidates',
          localField: '_id',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      { $unwind: '$candidate' },
      {
        $project: {
          _id: 0,
          candidateId: '$_id',
          candidateName: '$candidate.name',
          party: '$candidate.party',
          photoUrl: '$candidate.photoUrl',
          voteCount: 1,
        },
      },
      { $sort: { voteCount: -1 } }, // Highest vote count first
    ]);

    const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

    return {
      election: {
        id: election._id,
        title: election.title,
        status: election.status,
      },
      totalVotes,
      results: results.map(r => ({
        ...r,
        percentage: totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(2) : '0.00',
      })),
    };
  }
}

module.exports = new ElectionService();
