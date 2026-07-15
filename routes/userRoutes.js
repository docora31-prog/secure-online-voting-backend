const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidator = require('../validators/userValidator');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Only allow logged in users (both voters and admins can manage their own profile)
router.use(protect);
router.use(authorize('voter', 'admin'));

// Profile Routes
router.route('/profile')
  .get(userController.getProfile)
  .put(
    userValidator.updateProfileRules(),
    userValidator.validate,
    userController.updateProfile
  );

router.post('/profile/image', userController.uploadProfileImage); // Would include Multer middleware here

router.put('/change-password',
  userValidator.changePasswordRules(),
  userValidator.validate,
  userController.changePassword
);

// Voting History
router.get('/history', userController.getVotingHistory);

module.exports = router;
