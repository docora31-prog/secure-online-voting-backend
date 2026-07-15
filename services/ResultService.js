const mongoose = require('mongoose');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const User = require('../models/User');

class ResultService {
  /**
   * Calculates the results of an election dynamically using MongoDB Aggregation.
   * Fraudulent votes are rejected at casting time in the existing architecture, 
   * so all votes present in the database are considered valid.
   */
  async calculateElectionResults(electionId) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new Error('Election not found');
    }

    // Only allow results for completed elections
    if (election.status !== 'completed') {
      throw new Error('Results are only available for completed elections');
    }

    // 1. Fetch all candidates to ensure candidates with 0 votes are included
    const candidates = await Candidate.find({ electionId }).lean();
    
    // 2. Aggregate votes
    const voteCounts = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      {
        $group: {
          _id: '$candidateId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Map aggregated counts by candidateId for O(1) lookup
    const countsMap = {};
    let totalVotes = 0;
    for (const vc of voteCounts) {
      countsMap[vc._id.toString()] = vc.count;
      totalVotes += vc.count;
    }

    // 3. Merge candidates with counts
    let mergedResults = candidates.map(c => {
      const vCount = countsMap[c._id.toString()] || 0;
      return {
        candidateId: c._id,
        name: c.name,
        party: c.party,
        photoUrl: c.photoUrl,
        voteCount: vCount,
        percentage: totalVotes > 0 ? ((vCount / totalVotes) * 100).toFixed(2) : '0.00'
      };
    });

    // 4. Sort descending by vote count
    mergedResults.sort((a, b) => b.voteCount - a.voteCount);

    // 5. Determine winner and tie
    let winner = null;
    let isTie = false;
    
    if (mergedResults.length > 0 && totalVotes > 0) {
      const highestVotes = mergedResults[0].voteCount;
      // Check if the second place has the same amount of votes
      if (mergedResults.length > 1 && mergedResults[1].voteCount === highestVotes) {
        isTie = true;
      } else {
        winner = mergedResults[0];
      }
    }

    // 6. Calculate statistics
    const totalRegisteredVoters = await User.countDocuments({ role: 'voter' });
    const voterTurnout = totalRegisteredVoters > 0 
      ? ((totalVotes / totalRegisteredVoters) * 100).toFixed(2) 
      : '0.00';
      
    // Log RESULT_GENERATED if this is a first-time explicit calculation or similar. 
    // We'll just ensure the audit logs capture recalculation from controller.
    // For automatic RESULT_GENERATED, we will add it to the closeElection process instead.


    return {
      election: {
        id: election._id,
        title: election.title,
        type: election.type,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate
      },
      statistics: {
        totalRegisteredVoters,
        totalVotesCast: totalVotes,
        voterTurnoutPercentage: voterTurnout,
        declarationTime: new Date(),
        winningMargin: winner ? (mergedResults[0].voteCount - (mergedResults.length > 1 ? mergedResults[1].voteCount : 0)) : 0,
        completionTime: election.endDate || new Date()
      },
      winner: winner,
      isTie: isTie,
      candidates: mergedResults
    };
  }
}

module.exports = new ResultService();
