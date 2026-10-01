import mongoose from "mongoose";

const complaintTimelineSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "system" },
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
  },
  { timestamps: true },
);

export default mongoose.model("ComplaintTimeline", complaintTimelineSchema);
