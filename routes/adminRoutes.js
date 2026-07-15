const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminValidator = require('../validators/adminValidator');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All admin routes require authentication AND specific admin roles
router.use(protect);
router.use(authorize('admin'));

// Manage Users
router.route('/users')
  .get(adminController.getAllUsers);

router.route('/audit-logs')
  .get(adminController.getAuditLogs);

router.route('/users/:id')
  .get(
    adminValidator.userIdRule(),
    adminValidator.validate,
    adminController.getUserDetails
  )
  .delete(
    adminValidator.userIdRule(),
    adminValidator.validate,
    adminController.deleteUser
  );

router.put('/users/:id/suspend',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.suspendUser
);

router.put('/users/:id/activate',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.activateUser
);

router.patch('/users/:id/verify',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.verifyUser
);

router.patch('/users/:id/clear-flag',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.clearFlag
);

router.patch('/users/:id/reset-attempts',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.resetFaceAttempts
);

router.patch('/users/:id/reset-score',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.resetFraudScore
);

router.patch('/users/:id/suspend',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.suspendUser
);

router.put('/users/:id/role',
  adminValidator.userIdRule(),
  adminValidator.validate,
  adminController.updateUserRole
);

router.get('/verify-receipt/:receiptId', adminController.verifyVoteReceipt);

module.exports = router;
