const { param, body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  
  return res.status(422).json({
    success: false,
    errors: errors.array().map(err => ({ [err.path]: err.msg })),
  });
};

exports.userIdRule = () => {
  return [
    param('id').isMongoId().withMessage('Invalid User ID format')
  ];
};

exports.updateUserStatusRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid User ID format'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ];
};
