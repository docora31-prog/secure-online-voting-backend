const AuditLog = require('../models/AuditLog');

/**
 * Service to easily log audit trails across the application.
 */
class AuditService {
  async logAction({ action, actorId, actorModel, targetId, targetModel, details, ipAddress }) {
    try {
      await AuditLog.create({
        action,
        actorId,
        actorModel,
        targetId,
        targetModel,
        details,
        ipAddress
      });
    } catch (error) {
      console.error('Audit Log Failed:', error);
      // We usually don't want to break the main application flow if logging fails
    }
  }
}

module.exports = new AuditService();
