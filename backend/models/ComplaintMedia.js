import mongoose from "mongoose";

const complaintMediaSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, default: "image" },
    format: String,
    bytes: Number,
    width: Number,
    height: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("ComplaintMedia", complaintMediaSchema);
