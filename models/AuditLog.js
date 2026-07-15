const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true, // e.g., 'ELECTION_CREATED', 'USER_VERIFIED', 'VOTE_CAST'
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // Could be a User ID or Admin ID
      index: true,
    },
    actorModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin', 'System'], // Used for dynamic referencing if needed
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // What was affected (e.g., Election ID, Candidate ID)
    },
    targetModel: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible object to store JSON payload of the action
    },
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
