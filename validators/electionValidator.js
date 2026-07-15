const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  console.log('VALIDATION ERRORS:', errors.array());
  return res.status(422).json({
    success: false,
    errors: errors.array().map(err => ({ [err.path]: err.msg })),
  });
};

const createElectionRules = () => [
  body('title').trim().notEmpty().withMessage('Election title is required').isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
  body('type').trim().notEmpty().withMessage('Election type is required'),
  body('startDate').notEmpty().withMessage('Start date is required').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('description').optional().trim(),
];

const updateElectionRules = () => [
  param('id').isMongoId().withMessage('Invalid election ID'),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('type').optional().trim().notEmpty(),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']).withMessage('Invalid status value'),
];

const electionIdRule = () => [
  param('id').isMongoId().withMessage('Invalid election ID'),
];

module.exports = { validate, createElectionRules, updateElectionRules, electionIdRule };
