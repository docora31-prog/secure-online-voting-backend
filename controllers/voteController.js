const votingService = require('../services/VotingService');
const auditService = require('../services/auditService');
const AIService = require('../services/AIService');
const User = require('../models/User');
const Setting = require('../models/Setting');

/**
 * @desc    Cast a vote
 * @route   POST /api/v1/votes
 * @access  Voter only (authenticated)
 */
exports.castVote = async (req, res) => {
  try {
    const { electionId, candidateId, image } = req.body;

    if (!image) {
      return res.status(403).json({ success: false, message: 'Facial verification is required to cast a vote.' });
    }

    const user = await User.findById(req.user.id).select('+faceEncodings +faceEmbeddings');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isFlagged || user.status === 'flagged') {
      return res.status(403).json({ 
        success: false, 
        isFlagged: true,
        message: 'Your account has been temporarily flagged due to repeated face verification failures. Please contact the administrator.',
        errorCode: 'ACCOUNT_FLAGGED'
      });
    }

    const settings = await Setting.findOne();
    const faceVerifier = require('../services/FaceVerificationService');
    
    try {
      const verifyResult = await faceVerifier.verifyUserFace(user, image, settings, req.ip, req.headers['user-agent'] || 'unknown', { context: 'Voting', electionId });
      if (!verifyResult.success) {
        return res.status(403).json({
          success: false,
          verified: false,
          failedAttempts: verifyResult.failedAttempts,
          remainingAttempts: verifyResult.remainingAttempts,
          fraudRiskScore: verifyResult.fraudRiskScore,
          isFlagged: verifyResult.isFlagged,
          message: verifyResult.message,
          errorCode: verifyResult.errorCode
        });
      }
    } catch (error) {
      return res.status(403).json({ success: false, message: error.message });
    }

    // --- Pre-AI Check: Ensure user hasn't already voted ---
    // (This prevents wasting AI resources and avoids blocking a duplicate vote with a 503 if AI is offline)
    const hasVoted = await votingService.hasUserVoted(req.user.id, electionId);
    if (hasVoted) {
      return res.status(409).json({ success: false, message: 'You have already voted in this election. Duplicate voting is not permitted.' });
    }

    // --- AI Fraud Detection ---
    console.log(`[VoteController] Initiating AI Fraud Check for User: ${req.user.id}`);
    const fraudData = {
      userId: req.user.id,
      electionId,
      candidateId,
      ipAddress: req.ip,
      timestamp: new Date().toISOString(),
      device: req.headers['user-agent'] || 'unknown',
      faceVerificationStatus: 'passed',
      loginAttempts: user.failedLoginAttempts || 0,
      maxLoginAttempts: settings?.maximumLoginAttempts ?? 5,
      maxRequestsPerMinute: settings?.maxRequestsPerMinute ?? 10,
      minimumRequestInterval: settings?.minimumRequestInterval ?? 2,
    };

    let fraudResult;
    try {
      fraudResult = await AIService.fraudCheck(fraudData);
      console.log(`[VoteController] AI Response:`, JSON.stringify(fraudResult));
    } catch (error) {
      console.error(`[VoteController] AI Service Error during fraud check:`, error.message);
      return res.status(503).json({ 
        success: false, 
        message: 'The AI verification service is temporarily unavailable. Please try again later.',
        errorCode: 'AI_SERVICE_UNAVAILABLE'
      });
    }

    if (fraudResult && (fraudResult.fraud === true || (fraudResult.riskScore && fraudResult.riskScore > 0))) {
      user.fraudRiskScore = (user.fraudRiskScore || 0) + (fraudResult.riskScore || 0);
      
      if (fraudResult.fraud === true || user.fraudRiskScore >= scoreThreshold) {
        console.warn(`[VoteController] FRAUD DETECTED for User: ${req.user.id} | Reason: ${fraudResult.reason}`);
        
        // Flag user
        user.isFlagged = true;
        user.status = 'flagged';
        user.flagReason = fraudResult.reason || 'Suspicious Voting Pattern';
        await user.save();
      
      // Log the incident
      await auditService.logAction({
        action: 'FRAUD_DETECTED',
        actorId: req.user.id,
        actorModel: 'User',
        targetId: electionId,
        targetModel: 'Election',
        details: { reason: fraudResult.reason, riskScore: fraudResult.riskScore },
        ipAddress: req.ip,
      });

      return res.status(403).json({ 
        success: false, 
        message: 'Your voting attempt was flagged as suspicious. Please contact support.' 
      });
      }
    } else if (fraudResult && fraudResult.riskScore > 0) {
      // Not flagged yet, but risk score increased
      await user.save();
    }
    
    console.log(`[VoteController] AI Fraud Check Passed for User: ${req.user.id}`);

    // --- Write vote to MongoDB ---
    const receipt = await votingService.castVote({
      userId: req.user.id,
      electionId,
      candidateId,
      ipAddress: req.ip,
      deviceSignature: req.headers['user-agent'] || 'unknown',
    });

    console.log(`[VoteController] Vote cast successfully for User: ${req.user.id}, Receipt: ${receipt.receiptId}`);

    // Log the FACT that a vote was cast — never log WHO voted for WHOM
    await auditService.logAction({
      action: 'VOTE_CAST',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: electionId,
      targetModel: 'Election',
      details: { receiptId: receipt.receiptId },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: receipt,
    });
  } catch (error) {
    // Check for duplicate vote error specifically (fallback if race condition)
    if (error.message.includes('already voted')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Check if the logged-in user has voted in an election
 * @route   GET /api/v1/votes/check/:electionId
 * @access  Voter only (authenticated)
 */
exports.checkVoteStatus = async (req, res) => {
  try {
    const voteId = await votingService.hasUserVoted(req.user.id, req.params.electionId);
    res.status(200).json({ success: true, data: { hasVoted: !!voteId, voteId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get voting history for the logged-in user
 * @route   GET /api/v1/votes/history
 * @access  Voter only (authenticated)
 */
exports.getVotingHistory = async (req, res) => {
  try {
    const history = await votingService.getUserVotingHistory(req.user.id);
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get vote receipt metadata
 * @route   GET /api/v1/votes/receipt/:voteId
 * @access  Voter only (must own the vote)
 */
exports.getVoteReceipt = async (req, res) => {
  try {
    const Vote = require('../models/Vote');
    const vote = await Vote.findOne({ _id: req.params.voteId, userId: req.user.id })
      .populate('electionId', 'title startDate')
      .populate('candidateId', 'name party');
      
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Log receipt viewed
    const auditService = require('../services/auditService');
    await auditService.logAction({
      action: 'VOTE_RECEIPT_VIEWED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: vote._id,
      targetModel: 'Vote',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: {
        receiptId: vote._id,
        electionName: vote.electionId.title,
        electionDate: vote.electionId.startDate,
        timestamp: vote.createdAt,
        transactionStatus: 'Confirmed',
        verificationStatus: 'Verified'
        // Intentionally omitting candidate info for the raw receipt view per security requirements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Log success page view
 * @route   POST /api/v1/votes/success-view
 * @access  Voter only
 */
exports.logSuccessView = async (req, res) => {
  try {
    const auditService = require('../services/auditService');
    await auditService.logAction({
      action: 'VOTE_SUCCESS_PAGE_VIEWED',
      actorId: req.user.id,
      actorModel: 'User',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
