const electionService = require('../services/electionService');
const auditService = require('../services/auditService');
const resultService = require('../services/ResultService');

/**
 * @desc    Get all elections (with optional filters)
 * @route   GET /api/v1/elections
 * @access  Public
 */
exports.getAllElections = async (req, res) => {
  try {
    const elections = await electionService.getAllElections(req.query);
    res.status(200).json({ success: true, count: elections.length, data: elections });
  } catch (error) {
    console.error('getAllElections error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get single election by ID
 * @route   GET /api/v1/elections/:id
 * @access  Public
 */
exports.getElectionById = async (req, res) => {
  try {
    const election = await electionService.getElectionById(req.params.id);
    res.status(200).json({ success: true, data: election });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get real-time election results
 * @route   GET /api/v1/elections/:id/results
 * @access  Public (Results visible only for completed elections)
 */
exports.getElectionResults = async (req, res) => {
  try {
    const results = await resultService.calculateElectionResults(req.params.id);
    if (req.user) {
      await auditService.logAction({
        action: 'RESULT_VIEWED',
        actorId: req.user.id,
        actorModel: 'User',
        targetId: req.params.id,
        targetModel: 'Election',
        ipAddress: req.ip,
      });
    }
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    if (error.message.includes('only available for completed elections')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Recalculate election results manually
 * @route   POST /api/v1/elections/:id/results/recalculate
 * @access  Admin only
 */
exports.recalculateResults = async (req, res) => {
  try {
    const results = await resultService.calculateElectionResults(req.params.id);
    await auditService.logAction({
      action: 'RESULT_RECALCULATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: req.params.id,
      targetModel: 'Election',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: results, message: 'Results recalculated successfully' });
  } catch (error) {
    if (error.message.includes('only available for completed elections')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new election
 * @route   POST /api/v1/elections
 * @access  Admin only
 */
exports.createElection = async (req, res) => {
  try {
    const election = await electionService.createElection(req.body, req.user.id);
    await auditService.logAction({
      action: 'ELECTION_CREATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: election._id,
      targetModel: 'Election',
      details: { title: election.title },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: election });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update an election
 * @route   PUT /api/v1/elections/:id
 * @access  Admin only
 */
exports.updateElection = async (req, res) => {
  try {
    const election = await electionService.updateElection(req.params.id, req.body);
    await auditService.logAction({
      action: 'ELECTION_UPDATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: election._id,
      targetModel: 'Election',
      details: req.body,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: election });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete an election
 * @route   DELETE /api/v1/elections/:id
 * @access  Admin only
 */
exports.deleteElection = async (req, res) => {
  try {
    await electionService.deleteElection(req.params.id);
    await auditService.logAction({
      action: 'ELECTION_DELETED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: req.params.id,
      targetModel: 'Election',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: 'Election deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Activate an election (upcoming → ongoing)
 * @route   PUT /api/v1/elections/:id/activate
 * @access  Admin only
 */
exports.activateElection = async (req, res) => {
  try {
    const election = await electionService.activateElection(req.params.id);
    await auditService.logAction({
      action: 'ELECTION_ACTIVATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: election._id,
      targetModel: 'Election',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: election, message: 'Election is now live' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Close an election (ongoing → completed)
 * @route   PUT /api/v1/elections/:id/close
 * @access  Admin only
 */
exports.closeElection = async (req, res) => {
  try {
    const election = await electionService.closeElection(req.params.id);
    await auditService.logAction({
      action: 'ELECTION_CLOSED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: election._id,
      targetModel: 'Election',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: election, message: 'Election has been closed' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
