import AIAnalysis from "../models/AIAnalysis.js";
import ComplaintMedia from "../models/ComplaintMedia.js";
import {
  getDepartmentForCategory,
  getSlaDueAt,
  inferCategoryFromText,
  normalizeComplaintCategory,
  SLA_RESPONSE_HOURS,
  toPublicStatus,
  toWorkflowStatus,
} from "../constants/workflow.js";
import { complaintRepository } from "../repositories/complaintRepository.js";
import { analyzeComplaintText, validateComplaintImages } from "./aiService.js";
import { isCloudinaryConfigured, uploadEvidenceFile } from "./cloudinaryService.js";
import {
  getCommunicationSummary,
  processComplaintCommunication,
} from "./communicationService.js";
import { recordComplaintLifecycleEvent } from "./lifecycleService.js";
import { getDashboardSnapshot } from "./dashboardService.js";
import { getTimeline } from "./timelineService.js";
import { toDashboardComplaint, toPublicComplaint } from "./complaintSerializer.js";
import { generateTicketId, normalizeLegacyTicket } from "../utils/ticket.js";
import { maskName, maskPhone } from "../utils/privacy.js";
import { ApiError } from "../utils/ApiError.js";
import { resolveComplaintLocation } from "./geocodingService.js";
import { env } from "../config/env.js";

export { getDashboardSnapshot };

export async function validateComplaintEvidence({ payload, files = [] }) {
  if (!files.length) {
    console.info("[complaints] image validation gate skipped: no images uploaded");
    return;
  }

  console.info("[complaints] image validation gate entered", {
    imageCount: files.length,
    images: files.map((file) => ({
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      bytes: file.buffer?.length || 0,
    })),
  });

  const complaintText = getComplaintText(payload);
  const category = normalizeComplaintCategory(
    inferCategoryFromText(getCategorySearchText(payload, complaintText)) || payload.category,
  );
  const validations = await validateComplaintImages(files, { complaintText, category });
  console.info("[complaints] image validation gate result", {
    results: validations.map((validation) => ({
      valid: validation.valid,
      relevant: validation.relevant,
      confidence: validation.confidence,
      reason: validation.reason,
      detectedIssue: validation.detectedIssue,
    })),
  });

  const invalidImage = validations.find(
    (validation) => !validation.valid || !validation.relevant,
  );
  if (invalidImage) {
    console.warn("[complaints] image validation gate rejected request", {
      valid: invalidImage.valid,
      relevant: invalidImage.relevant,
      confidence: invalidImage.confidence,
      reason: invalidImage.reason,
    });
    throw new ApiError(
      422,
      "Invalid evidence image. Please upload an image that clearly relates to your complaint.",
      { imageValidation: invalidImage },
      "INVALID_EVIDENCE_IMAGE",
    );
  }

  console.info("[complaints] image validation gate passed; persistence may continue");
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function getComplaintText(payload) {
  return payload.complaint || payload.description || payload.summary;
}

function getCategorySearchText(payload, complaintText) {
  return [
    payload.title,
    payload.complaint,
    payload.description,
    payload.summary,
    complaintText,
  ]
    .filter(Boolean)
    .join(" ");
}

function getCitizenSnapshot(payload, user) {
  const phone = payload.citizenPhone || payload.phone || user?.phone || "";
  const name = payload.citizenName || payload.name || user?.name || "Citizen";

  return {
    name,
    maskedName: maskName(name),
    phone,
    maskedPhone: maskPhone(phone),
    email: payload.email || user?.email,
  };
}

function toLocationPayload(resolvedLocation) {
  return {
    address: resolvedLocation.address,
    sector: resolvedLocation.sector,
    ward: resolvedLocation.ward,
    city: resolvedLocation.city,
    state: resolvedLocation.state,
    pincode: resolvedLocation.pincode,
    ...(resolvedLocation.coordinates
      ? {
          coordinates: {
            type: "Point",
            coordinates: [
              resolvedLocation.coordinates.lng,
              resolvedLocation.coordinates.lat,
            ],
          },
          coordinateSource: resolvedLocation.coordinateSource,
          geocodingProvider: resolvedLocation.geocodingProvider,
        }
      : {}),
  };
}

async function uploadEvidence(files, complaint, user) {
  if (!files.length) {
    return [];
  }

  if (!isCloudinaryConfigured()) {
    if (env.nodeEnv !== "production") {
      console.warn(
        "Evidence upload skipped because Cloudinary is not configured.",
      );
      return [];
    }

    throw new ApiError(503, "Evidence upload is not configured. Add Cloudinary keys or submit without images.");
  }

  const uploadedMedia = [];
  for (const file of files) {
    uploadedMedia.push(await uploadEvidenceFile(file));
  }

  return Promise.all(
    uploadedMedia.map((uploaded) =>
      ComplaintMedia.create({
        complaint: complaint._id,
        uploadedBy: user?._id,
        ...uploaded,
      }),
    ),
  );
}

export async function createComplaint({ payload, files = [], user = null, io = null, request }) {
  const originalText = getComplaintText(payload);
  if (!originalText) {
    throw new ApiError(422, "Complaint text is required.");
  }

  const recentComplaints = await complaintRepository.findRecentSince(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  const ai = await analyzeComplaintText(originalText, recentComplaints);

  if (ai.validityStatus === "invalid") {
    throw new ApiError(422, ai.moderationReason || "Complaint rejected by moderation.", ai);
  }

  const category = normalizeComplaintCategory(
    inferCategoryFromText(getCategorySearchText(payload, originalText)) ||
      ai.category ||
      payload.category,
  );
  ai.category = category;

  const { ticketId, ticketSequence } = await generateTicketId();
  const resolvedLocation = await resolveComplaintLocation(payload);
  const priority = ai.priority || ai.severityLevel || "Medium";
  const status = ai.validityStatus === "needs_review" ? "Under Review" : "Pending";
  const now = new Date();

  const complaint = await complaintRepository.create({
    ticketId,
    ticketSequence,
    citizen: user?._id,
    citizenSnapshot: getCitizenSnapshot(payload, user),
    title: String(payload.title || originalText).slice(0, 90),
    originalText,
    translatedText: ai.translatedText || originalText,
    summary: ai.interpretation || `${category} complaint received from ${resolvedLocation.sector}.`,
    detectedLanguage: ai.detectedLanguage || payload.language || "en",
    languageName: ai.languageName || "English",
    category,
    severity: ai.severityLevel || "Medium",
    priority,
    status,
    statusLabel: status,
    department: getDepartmentForCategory(category),
    location: toLocationPayload(resolvedLocation),
    moderationStatus: ai.validityStatus === "valid" ? "accepted" : "needs_review",
    isDuplicateSuspected: ai.duplicateProbability > 0.75,
    source: payload.source || "web",
    sla: {
      responseHours: SLA_RESPONSE_HOURS[priority] ?? SLA_RESPONSE_HOURS.Medium,
      dueAt: getSlaDueAt(priority, now),
      status: "active",
    },
  });

  await AIAnalysis.create({ complaint: complaint._id, ...ai });

  const mediaDocs = await uploadEvidence(files, complaint, user);
  if (mediaDocs.length) {
    complaint.media = mediaDocs.map((item) => item._id);
  }

  const populatedComplaint = await recordComplaintLifecycleEvent({
    complaint,
    actor: user,
    action: "Complaint registered",
    eventType: "intake",
    toStatus: complaint.status,
    note: "Complaint accepted and ticket generated.",
    metadata: {
      moderationStatus: complaint.moderationStatus,
      aiProvider: ai.provider,
      confidenceScore: ai.confidenceScore,
      publicStatus: toPublicStatus(complaint.status),
    },
    io,
    request,
  });

  await processComplaintCommunication(populatedComplaint, { io });
  const communicationSummary = await getCommunicationSummary(populatedComplaint.ticketId);
  const complaintWithCommunication = {
    ...(populatedComplaint.toObject ? populatedComplaint.toObject() : populatedComplaint),
    communicationSummary,
  };
  io?.to("admin").emit("complaint:created", toDashboardComplaint(complaintWithCommunication));
  io?.to(`ticket:${populatedComplaint.ticketId}`).emit("complaint:created", toPublicComplaint(complaintWithCommunication));

  return complaintWithCommunication;
}

export function findComplaintByTicket(identifier) {
  return complaintRepository.findByTicket(identifier);
}

export async function getComplaintOrThrow(ticketId) {
  const complaint = await findComplaintByTicket(ticketId);
  if (!complaint) throw new ApiError(404, "Ticket not found.");
  return complaint;
}

export async function updateComplaintStatus({ ticketId, status, actor, note, io, request }) {
  const complaint = await getComplaintOrThrow(ticketId);
  const fromStatus = complaint.status;
  const workflowStatus = toWorkflowStatus(status);

  complaint.status = workflowStatus;
  complaint.statusLabel = workflowStatus;
  complaint.sla = {
    ...(complaint.sla?.toObject?.() || complaint.sla || {}),
    firstActionAt: complaint.sla?.firstActionAt || new Date(),
  };

  if (workflowStatus === "Resolved") {
    complaint.resolvedAt = new Date();
    complaint.sla.resolvedAt = complaint.resolvedAt;
  }

  return recordComplaintLifecycleEvent({
    complaint,
    actor,
    action: "Updated complaint status",
    eventType: "status_change",
    fromStatus,
    toStatus: workflowStatus,
    note,
    metadata: {
      publicFromStatus: toPublicStatus(fromStatus),
      publicToStatus: toPublicStatus(workflowStatus),
    },
    io,
    request,
    notify: true,
  });
}

export async function updateComplaint({ id, payload, files = [], actor, io, request }) {
  const complaint = await getComplaintOrThrow(id);
  const fromStatus = complaint.status;
  let eventType = "system";

  if (payload.status) {
    const workflowStatus = toWorkflowStatus(payload.status);
    complaint.status = workflowStatus;
    complaint.statusLabel = workflowStatus;
    complaint.sla = {
      ...(complaint.sla?.toObject?.() || complaint.sla || {}),
      firstActionAt: complaint.sla?.firstActionAt || new Date(),
    };
    eventType = "status_change";

    if (workflowStatus === "Resolved") {
      complaint.resolvedAt = new Date();
      complaint.sla.resolvedAt = complaint.resolvedAt;
    }
  }

  if (payload.complaint || payload.description || payload.summary) {
    const nextText = payload.complaint || payload.description || complaint.originalText;
    complaint.originalText = nextText;
    complaint.translatedText = payload.translatedText || nextText;
    complaint.summary = payload.summary || payload.description || payload.complaint || complaint.summary;
    complaint.title = String(payload.title || complaint.summary).slice(0, 90);
  }

  if (payload.category) {
    complaint.category = normalizeComplaintCategory(payload.category);
    complaint.department = payload.assignedDepartment || getDepartmentForCategory(complaint.category);
  }

  if (payload.assignedOfficer) {
    complaint.assignedOfficer = payload.assignedOfficer;
    eventType = "assignment";
  }

  if (payload.workerAction || payload.workerStatus || payload.workerLat || payload.workerLng) {
    complaint.assignedWorkerSnapshot = {
      ...(complaint.assignedWorkerSnapshot?.toObject?.() || complaint.assignedWorkerSnapshot || {}),
      workerUser: actor?._id || actor?.id,
      workerId: actor?.workerId,
      name: actor?.name,
      role: actor?.role,
      status: payload.workerStatus || payload.workerAction || "Accepted",
      acceptedAt:
        complaint.assignedWorkerSnapshot?.acceptedAt ||
        (payload.workerAction === "Accepted" ? new Date() : undefined),
      checkInAt:
        complaint.assignedWorkerSnapshot?.checkInAt ||
        (payload.workerAction === "GPS Check-in" ? new Date() : undefined),
      location:
        payload.workerLat && payload.workerLng
          ? { lat: Number(payload.workerLat), lng: Number(payload.workerLng) }
          : complaint.assignedWorkerSnapshot?.location,
    };
    eventType = payload.workerAction === "Accepted" ? "assignment" : "status_change";
  }

  if (payload.location || payload.sector || payload.address || payload.latitude || payload.lat) {
    const resolvedLocation = await resolveComplaintLocation(payload);
    complaint.location = {
      ...complaint.location,
      ...toLocationPayload(resolvedLocation),
    };
  }

  const uploadedMedia = await uploadEvidence(files, complaint, actor);
  if (uploadedMedia.length) {
    complaint.media = [
      ...(complaint.media || []).map((item) => item._id || item),
      ...uploadedMedia.map((item) => item._id),
    ];
  }

  return recordComplaintLifecycleEvent({
    complaint,
    actor,
    action: payload.action || "Updated complaint",
    eventType,
    fromStatus,
    toStatus: complaint.status,
    note: payload.note,
    metadata: {
      publicFromStatus: toPublicStatus(fromStatus),
      publicToStatus: toPublicStatus(complaint.status),
      uploadedImages: String(uploadedMedia.length),
    },
    io,
    request,
    notify: Boolean(payload.status),
  });
}

export async function listComplaints() {
  const complaints = await complaintRepository.listPublic();
  return complaints.map(toPublicComplaint);
}

export async function listCitizenComplaints(user) {
  const complaints = await complaintRepository.listForCitizen(user);
  return complaints.map(toPublicComplaint);
}

export async function getComplaintTimeline(ticketId) {
  await getComplaintOrThrow(ticketId);
  return getTimeline(normalizeLegacyTicket(ticketId));
}

export function isComplaintOwnedByUser(complaint, user) {
  if (!complaint || !user) return false;

  const plain = complaint.toObject ? complaint.toObject() : complaint;
  const complaintCitizenId = plain.citizen?._id || plain.citizen;
  const userId = user._id || user.id;

  if (complaintCitizenId && userId && String(complaintCitizenId) === String(userId)) {
    return true;
  }

  if (plain.citizenSnapshot?.email && user.email) {
    return String(plain.citizenSnapshot.email).toLowerCase() === String(user.email).toLowerCase();
  }

  const complaintPhone = digitsOnly(plain.citizenSnapshot?.phone);
  const userPhone = digitsOnly(user.phone);
  return Boolean(complaintPhone && userPhone && complaintPhone.endsWith(userPhone.slice(-10)));
}

export async function getCitizenComplaintOrThrow(ticketId, user) {
  const complaint = await getComplaintOrThrow(ticketId);

  if (!isComplaintOwnedByUser(complaint, user)) {
    throw new ApiError(404, "Ticket not found.");
  }

  return complaint;
}

export async function addCitizenComplaintAction({
  ticketId,
  action,
  note,
  rating,
  files = [],
  actor,
  io,
  request,
}) {
  const complaint = await getCitizenComplaintOrThrow(ticketId, actor);
  const uploadedMedia = await uploadEvidence(files, complaint, actor);
  const fromStatus = complaint.status;
  let toStatus = complaint.status;
  let eventType = "comment";
  let actionLabel = "Citizen comment added";

  if (!Array.isArray(complaint.citizenActions)) {
    complaint.citizenActions = [];
  }

  if (uploadedMedia.length) {
    complaint.media = [
      ...(complaint.media || []).map((item) => item._id || item),
      ...uploadedMedia.map((item) => item._id),
    ];
  }

  if (action === "reopen") {
    if (complaint.status !== "Resolved") {
      throw new ApiError(409, "Only resolved complaints can be reopened.");
    }

    complaint.status = "In Progress";
    complaint.statusLabel = "In Progress";
    complaint.resolvedAt = undefined;
    complaint.resolutionConfirmedAt = undefined;
    toStatus = complaint.status;
    eventType = "status_change";
    actionLabel = "Citizen reopened complaint";
  }

  if (action === "confirm_resolution") {
    if (complaint.status !== "Resolved") {
      throw new ApiError(409, "Only resolved complaints can be confirmed.");
    }

    complaint.resolutionConfirmedAt = new Date();
    actionLabel = "Citizen confirmed resolution";
  }

  if (action === "rate") {
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new ApiError(422, "Rating must be between 1 and 5.");
    }

    complaint.citizenRating = numericRating;
    actionLabel = "Citizen rated complaint handling";
  }

  complaint.citizenActions.push({
    actor: actor?._id || actor?.id,
    actorName: actor?.name || "Citizen",
    action,
    note,
    rating: action === "rate" ? Number(rating) : undefined,
    media: uploadedMedia.map((item) => item._id),
  });

  const updatedComplaint = await recordComplaintLifecycleEvent({
    complaint,
    actor,
    action: actionLabel,
    eventType,
    fromStatus,
    toStatus,
    note,
    metadata: {
      citizenAction: action,
      rating: action === "rate" ? String(rating) : undefined,
      uploadedImages: String(uploadedMedia.length),
    },
    io,
    request,
  });

  return toPublicComplaint(updatedComplaint);
}
