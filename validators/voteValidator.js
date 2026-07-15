const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    success: false,
    errors: errors.array().map(err => ({ [err.path]: err.msg })),
  });
};

const castVoteRules = () => [
  body('electionId').notEmpty().withMessage('Election ID is required').isMongoId().withMessage('Invalid election ID'),
  body('candidateId').notEmpty().withMessage('Candidate ID is required').isMongoId().withMessage('Invalid candidate ID'),
];

module.exports = { validate, castVoteRules };
