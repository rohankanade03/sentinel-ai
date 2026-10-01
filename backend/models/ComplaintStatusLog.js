import mongoose from "mongoose";

const complaintStatusLogSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    fromStatus: String,
    toStatus: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByName: String,
    reason: String,
  },
  { timestamps: true },
);

export default mongoose.model("ComplaintStatusLog", complaintStatusLogSchema);
