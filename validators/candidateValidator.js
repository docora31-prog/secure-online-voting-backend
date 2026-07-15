const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    success: false,
    errors: errors.array().map(err => ({ [err.path]: err.msg })),
  });
};

const addCandidateRules = () => [
  body('electionId').notEmpty().withMessage('Election ID is required').isMongoId().withMessage('Invalid election ID'),
  body('name').trim().notEmpty().withMessage('Candidate name is required'),
  body('party').trim().notEmpty().withMessage('Political party is required'),
  body('age').optional().isInt({ min: 18 }).withMessage('Candidate must be at least 18 years old'),
  body('education').optional().trim(),
  body('experience').optional().trim(),
  body('bio').optional().trim(),
];

const updateCandidateRules = () => [
  param('id').isMongoId().withMessage('Invalid candidate ID'),
  body('name').optional().trim().notEmpty(),
  body('party').optional().trim().notEmpty(),
  body('age').optional().isInt({ min: 18 }),
];

const candidateIdRule = () => [
  param('id').isMongoId().withMessage('Invalid candidate ID'),
];

module.exports = { validate, addCandidateRules, updateCandidateRules, candidateIdRule };
