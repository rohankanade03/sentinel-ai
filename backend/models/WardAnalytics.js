import mongoose from "mongoose";

const wardAnalyticsSchema = new mongoose.Schema(
  {
    ward: { type: String, required: true, index: true },
    sector: { type: String, index: true },
    dateBucket: { type: String, required: true, index: true },
    totalComplaints: { type: Number, default: 0 },
    pendingComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    criticalComplaints: { type: Number, default: 0 },
    topCategory: String,
    averageResolutionHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

wardAnalyticsSchema.index({ ward: 1, dateBucket: 1 }, { unique: true });

export default mongoose.model("WardAnalytics", wardAnalyticsSchema);
