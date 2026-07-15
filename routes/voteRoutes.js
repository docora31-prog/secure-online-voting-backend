const express = require('express');
const router = express.Router();

const voteController = require('../controllers/voteController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validate, castVoteRules } = require('../validators/voteValidator');

// All voting routes require a logged-in, verified voter
router.use(protect);
router.use(authorize('voter'));

// POST /api/v1/votes                          → Cast a vote
// GET  /api/v1/votes/history                  → Get user's voting history
// GET  /api/v1/votes/check/:electionId        → Check if user has voted in an election
router.post('/', castVoteRules(), validate, voteController.castVote);
router.get('/history', voteController.getVotingHistory);
router.get('/check/:electionId', voteController.checkVoteStatus);

router.get('/receipt/:voteId', voteController.getVoteReceipt);
router.post('/success-view', voteController.logSuccessView);

module.exports = router;
