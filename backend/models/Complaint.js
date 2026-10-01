import mongoose from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  WORKFLOW_STATUSES,
} from "../constants/workflow.js";

export const complaintStatuses = WORKFLOW_STATUSES;
export const complaintCategories = COMPLAINT_CATEGORIES;

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    ticketSequence: { type: Number, index: true },
    legacyTicketId: { type: String, index: true },
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    citizenSnapshot: {
      name: String,
      maskedName: String,
      phone: String,
      maskedPhone: String,
      email: String,
    },
    title: { type: String, required: true, trim: true },
    originalText: { type: String, required: true },
    translatedText: { type: String, required: true },
    summary: { type: String, required: true },
    detectedLanguage: { type: String, default: "en", index: true },
    languageName: { type: String, default: "English" },
    category: { type: String, enum: complaintCategories, default: "Other", index: true },
    severity: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", index: true },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", index: true },
    status: { type: String, enum: WORKFLOW_STATUSES, default: "Pending", index: true },
    statusLabel: { type: String, default: "Pending" },
    department: { type: String, default: "Civic Operations Desk", index: true },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "Officer" },
    assignedWorkerSnapshot: {
      workerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      workerId: String,
      name: String,
      role: String,
      status: String,
      acceptedAt: Date,
      checkInAt: Date,
      location: {
        lat: Number,
        lng: Number,
      },
    },
    sla: {
      responseHours: { type: Number, default: 24 },
      dueAt: { type: Date, index: true },
      firstActionAt: Date,
      resolvedAt: Date,
      status: {
        type: String,
        enum: ["active", "met", "breached", "paused"],
        default: "active",
        index: true,
      },
      breachedAt: Date,
    },
    officerActions: [
      {
        officer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        officerName: String,
        action: String,
        fromStatus: String,
        toStatus: String,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    citizenActions: [
      {
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorName: String,
        action: {
          type: String,
          enum: ["comment", "reopen", "confirm_resolution", "rate"],
          required: true,
        },
        note: String,
        rating: { type: Number, min: 1, max: 5 },
        media: [{ type: mongoose.Schema.Types.ObjectId, ref: "ComplaintMedia" }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolutionConfirmedAt: Date,
    citizenRating: { type: Number, min: 1, max: 5 },
    location: {
      address: String,
      sector: { type: String, index: true },
      ward: { type: String, index: true },
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number] },
      },
      coordinateSource: {
        type: String,
        enum: ["browser", "manual-pin", "import", "api"],
      },
      geocodingProvider: String,
    },
    media: [{ type: mongoose.Schema.Types.ObjectId, ref: "ComplaintMedia" }],
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    isDuplicateSuspected: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ["accepted", "rejected", "needs_review"],
      default: "needs_review",
      index: true,
    },
    rejectionReason: String,
    source: { type: String, enum: ["web", "mobile", "api", "import"], default: "web" },
    resolvedAt: Date,
  },
  { timestamps: true },
);

complaintSchema.index({ "location.coordinates": "2dsphere" });
complaintSchema.index({ category: 1, status: 1, createdAt: -1 });
complaintSchema.index({ "location.sector": 1, createdAt: -1 });
complaintSchema.index({ "sla.status": 1, "sla.dueAt": 1 });

export default mongoose.model("Complaint", complaintSchema);
