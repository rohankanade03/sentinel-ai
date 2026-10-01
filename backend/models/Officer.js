import mongoose from "mongoose";

const officerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    officerCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: true, index: true },
    ward: { type: String, index: true },
    phone: String,
    isAvailable: { type: Boolean, default: true },
    activeComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    averageResolutionHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Officer", officerSchema);
