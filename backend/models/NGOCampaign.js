import mongoose from "mongoose";

const ngoCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    ngoName: { type: String, required: true, trim: true, index: true },
    category: { type: String, index: true },
    ward: { type: String, index: true },
    sector: { type: String, index: true },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "archived"],
      default: "draft",
      index: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    linkedComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: "Complaint" }],
    startDate: Date,
    endDate: Date,
    metrics: {
      volunteers: { type: Number, default: 0 },
      citizensReached: { type: Number, default: 0 },
      complaintsResolved: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

ngoCampaignSchema.index({ status: 1, ward: 1, category: 1 });

export default mongoose.model("NGOCampaign", ngoCampaignSchema);
