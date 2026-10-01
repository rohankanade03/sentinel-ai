import AuditLog from "../models/AuditLog.js";

export const auditLogRepository = {
  create(payload) {
    return AuditLog.create(payload);
  },

  list(limit = 1000) {
    return AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("complaint", "title category status department location")
      .lean();
  },
};
