import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    provider: { type: String, enum: ["openai", "gemini", "local-policy"], required: true },
    originalText: String,
    translatedText: String,
    detectedLanguage: String,
    languageName: String,
    interpretation: String,
    isCivicRelated: Boolean,
    validityStatus: { type: String, enum: ["valid", "invalid", "needs_review"], index: true },
    moderationReason: String,
    confidenceScore: Number,
    severityLevel: String,
    priority: String,
    category: String,
    spamProbability: Number,
    duplicateProbability: Number,
    abusiveProbability: Number,
    fakeProbability: Number,
    rawResponse: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export default mongoose.model("AIAnalysis", aiAnalysisSchema);
