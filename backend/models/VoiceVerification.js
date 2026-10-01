import mongoose from "mongoose";

const voiceVerificationSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    ticketId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    phone: String,
    language: { type: String, default: "en" },
    transcript: String,
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed", "expired"],
      default: "pending",
      index: true,
    },
    confidenceScore: Number,
    provider: String,
    providerReference: String,
    verifiedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);

voiceVerificationSchema.index({ ticketId: 1, verificationStatus: 1 });

export default mongoose.model("VoiceVerification", voiceVerificationSchema);
