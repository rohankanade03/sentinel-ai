import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    ticketId: { type: String, index: true },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientPhone: String,
    channel: { type: String, enum: ["sms", "whatsapp", "email", "in_app"], required: true },
    language: { type: String, default: "en" },
    template: String,
    message: { type: String, required: true },
    provider: { type: String, default: "twilio" },
    providerMessageId: String,
    eventType: {
      type: String,
      enum: [
        "complaint_registered",
        "status_changed",
        "sla_breached",
        "assignment_changed",
        "emergency_alert",
        "fallback_confirmation",
        "tracking_link_generated",
      ],
      default: "complaint_registered",
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed", "undelivered", "skipped"],
      default: "queued",
      index: true,
    },
    dedupeKey: { type: String, unique: true, sparse: true },
    attempts: { type: Number, default: 0 },
    lastError: String,
    sentAt: Date,
    deliveredAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
