const candidateService = require('../services/candidateService');
const auditService = require('../services/auditService');

/**
 * @desc    Get all candidates across all elections
 * @route   GET /api/v1/candidates
 * @access  Public
 */
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await candidateService.getAllCandidates(req.query);
    res.status(200).json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get all candidates for an election
 * @route   GET /api/v1/elections/:electionId/candidates
 * @access  Public
 */
exports.getCandidatesByElection = async (req, res) => {
  try {
    const candidates = await candidateService.getCandidatesByElection(req.params.electionId);
    res.status(200).json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get single candidate by ID
 * @route   GET /api/v1/candidates/:id
 * @access  Public
 */
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await candidateService.getCandidateById(req.params.id);
    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add a new candidate
 * @route   POST /api/v1/candidates
 * @access  Admin only
 */
exports.addCandidate = async (req, res) => {
  try {
    const candidate = await candidateService.addCandidate(req.body);
    await auditService.logAction({
      action: 'CANDIDATE_ADDED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: candidate._id,
      targetModel: 'Candidate',
      details: { name: candidate.name, electionId: candidate.electionId },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a candidate
 * @route   PUT /api/v1/candidates/:id
 * @access  Admin only
 */
exports.updateCandidate = async (req, res) => {
  try {
    const candidate = await candidateService.updateCandidate(req.params.id, req.body);
    await auditService.logAction({
      action: 'CANDIDATE_UPDATED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: candidate._id,
      targetModel: 'Candidate',
      details: req.body,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Upload candidate photo
 * @route   POST /api/v1/candidates/:id/photo
 * @access  Admin only
 */
exports.uploadCandidatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }
    // Multer processes the file; path stored as photoUrl
    const photoUrl = `/uploads/candidates/${req.file.filename}`;
    const candidate = await candidateService.updateCandidate(req.params.id, { photoUrl });
    res.status(200).json({ success: true, data: candidate, message: 'Photo uploaded successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a candidate
 * @route   DELETE /api/v1/candidates/:id
 * @access  Admin only
 */
exports.deleteCandidate = async (req, res) => {
  try {
    await candidateService.deleteCandidate(req.params.id);
    await auditService.logAction({
      action: 'CANDIDATE_DELETED',
      actorId: req.user.id,
      actorModel: 'User',
      targetId: req.params.id,
      targetModel: 'Candidate',
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
