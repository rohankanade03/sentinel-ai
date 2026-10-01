import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    ticketId: { type: String, required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorId: String,
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "system", index: true },
    action: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["intake", "ai_analysis", "assignment", "status_change", "notification", "sla", "comment", "system"],
      default: "system",
      index: true,
    },
    fromStatus: String,
    toStatus: String,
    note: String,
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

auditLogSchema.index({ ticketId: 1, createdAt: -1 });
auditLogSchema.index({ actorRole: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
