const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Settings routes are strictly for administrators
router.use(protect);
router.use(authorize('admin'));

// AI configuration endpoints
router.get('/ai', settingController.getAiUrl);
router.post('/ai', settingController.updateAiUrl);
router.post('/ai/test', settingController.testConnection);

// General configuration endpoints
router.get('/general', settingController.getGeneralSettings);
router.post('/general', settingController.updateGeneralSettings);

module.exports = router;
