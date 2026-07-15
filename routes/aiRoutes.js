const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/status', aiController.getStatus);
router.post('/test-connection', aiController.testConnection);
router.post('/save-config', aiController.saveConfig);

router.post('/register-face', aiController.registerFace);
router.post('/verify-face', aiController.verifyFace);
router.post('/chat', aiController.chat);

router.post('/candidate-summary', aiController.candidateSummary);
router.post('/validate-email', aiController.validateEmail);

module.exports = router;
