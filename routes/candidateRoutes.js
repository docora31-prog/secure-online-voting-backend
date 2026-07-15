const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const candidateController = require('../controllers/candidateController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  validate,
  addCandidateRules,
  updateCandidateRules,
  candidateIdRule,
} = require('../validators/candidateValidator');

// ── Multer Configuration for candidate photos ────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/candidates/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `candidate-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});
// ──────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────
router.get('/', candidateController.getAllCandidates);
router.get('/:id', candidateIdRule(), validate, candidateController.getCandidateById);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────
router.use(protect);
router.use(authorize('admin'));

router.post('/', addCandidateRules(), validate, candidateController.addCandidate);
router.put('/:id', updateCandidateRules(), validate, candidateController.updateCandidate);
router.post('/:id/photo', upload.single('photo'), candidateController.uploadCandidatePhoto);
router.delete('/:id', candidateIdRule(), validate, candidateController.deleteCandidate);

module.exports = router;
