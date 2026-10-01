import mongoose from "mongoose";

const communicationLogSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    ticketId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["voice_call", "whatsapp", "sms", "email", "officer_alert", "tracking_link"],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["outbound", "inbound"], default: "outbound" },
    audience: { type: String, enum: ["citizen", "officer", "admin", "system"], default: "citizen" },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientPhone: String,
    recipientName: String,
    provider: { type: String, default: "twilio" },
    providerMessageId: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: [
        "queued",
        "accepted",
        "processing",
        "sending",
        "sent",
        "delivered",
        "read",
        "failed",
        "skipped",
        "retrying",
        "answered",
        "no-answer",
        "busy",
        "completed",
        "canceled",
        "undelivered",
      ],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    durationSeconds: Number,
    language: { type: String, default: "en" },
    message: String,
    trackingUrl: String,
    eventType: {
      type: String,
      enum: [
        "complaint_registered",
        "status_changed",
        "emergency_alert",
        "tracking_link_generated",
        "call_status",
        "fallback_confirmation",
      ],
      default: "complaint_registered",
      index: true,
    },
    priority: String,
    category: String,
    lastError: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    nextRetryAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

communicationLogSchema.index({ ticketId: 1, createdAt: -1 });
communicationLogSchema.index({ status: 1, nextRetryAt: 1 });

export default mongoose.model("CommunicationLog", communicationLogSchema);
