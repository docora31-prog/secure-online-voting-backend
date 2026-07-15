const express = require('express');
const router = express.Router();

const electionController = require('../controllers/electionController');
const candidateController = require('../controllers/candidateController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  validate,
  createElectionRules,
  updateElectionRules,
  electionIdRule,
} = require('../validators/electionValidator');

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES — No auth required
// ─────────────────────────────────────────────────────────────

// GET /api/v1/elections               → List all elections
// GET /api/v1/elections/:id           → Get single election details
// GET /api/v1/elections/:id/results   → Real-time results
// GET /api/v1/elections/:id/candidates → Candidates for an election
router.get('/', electionController.getAllElections);
router.get('/:id', electionIdRule(), validate, electionController.getElectionById);
router.get('/:id/results', electionIdRule(), validate, electionController.getElectionResults);
router.get('/:electionId/candidates', candidateController.getCandidatesByElection);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────
router.use(protect);
router.use(authorize('admin'));

// POST   /api/v1/elections             → Create election
// PUT    /api/v1/elections/:id         → Update election
// DELETE /api/v1/elections/:id         → Delete election
// PUT    /api/v1/elections/:id/activate → Activate election
// PUT    /api/v1/elections/:id/close    → Close election
router.post('/', (req, res, next) => { console.log('POST /elections req.body:', req.body); next(); }, createElectionRules(), validate, electionController.createElection);
router.put('/:id', updateElectionRules(), validate, electionController.updateElection);
router.delete('/:id', electionIdRule(), validate, electionController.deleteElection);
router.put('/:id/activate', electionIdRule(), validate, electionController.activateElection);
router.put('/:id/close', electionIdRule(), validate, electionController.closeElection);
router.post('/:id/results/recalculate', electionIdRule(), validate, electionController.recalculateResults);

module.exports = router;
