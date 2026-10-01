import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/apiResponse.js";
import { toPublicComplaint } from "../services/complaintSerializer.js";
import { buildTrackingLink, getSlaLabel } from "../services/communicationMessageService.js";
import { listCommunicationHistory } from "../services/communicationService.js";
import {
  addCitizenComplaintAction,
  createComplaint,
  getCitizenComplaintOrThrow,
  getComplaintOrThrow,
  getComplaintTimeline,
  getDashboardSnapshot,
  listCitizenComplaints,
  listComplaints,
  updateComplaint,
  updateComplaintStatus,
  validateComplaintEvidence,
} from "../services/complaintService.js";
import {
  addLocalCitizenComplaintAction,
  createLocalComplaint,
  getLocalCitizenComplaints,
  getLocalCitizenProgress,
  getLocalCitizenTracking,
  getLocalComplaints,
  getLocalDashboardSnapshot,
  getLocalTicket,
  getLocalTicketTimeline,
  isLocalDatabaseMode,
  updateLocalComplaint,
} from "../services/localDevStore.js";

export const createComplaintHandler = asyncHandler(async (request, response) => {
  console.info("[complaints] POST /api/complaints received", {
    databaseMode: request.app.get("databaseMode"),
    contentType: request.headers["content-type"],
    bodyFields: Object.keys(request.body || {}),
    fileCount: request.files?.length || 0,
    files: (request.files || []).map((file) => ({
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      bytes: file.buffer?.length || 0,
    })),
  });

  await validateComplaintEvidence({ payload: request.body, files: request.files || [] });
  console.info("[complaints] POST /api/complaints passed mandatory image gate");

  if (isLocalDatabaseMode(request)) {
    console.info("[complaints] dispatching to local JSON complaint creation");
    sendCreated(
      response,
      await createLocalComplaint(request.body, request.files || [], request.user),
      "Complaint registered successfully",
    );
    return;
  }

  console.info("[complaints] dispatching to MongoDB complaint creation");
  const complaint = await createComplaint({
    payload: request.body,
    files: request.files || [],
    user: request.user,
    io: request.app.get("io"),
    request,
  });
  sendCreated(response, toPublicComplaint(complaint), "Complaint registered successfully");
});

export const getDashboardHandler = asyncHandler(async (_request, response) => {
  if (response.req.app.get("databaseMode") === "local-json") {
    sendSuccess(response, getLocalDashboardSnapshot());
    return;
  }

  sendSuccess(response, await getDashboardSnapshot());
});

export const listComplaintsHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, getLocalComplaints());
    return;
  }

  sendSuccess(response, await listComplaints());
});

export const listMyComplaintsHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, getLocalCitizenComplaints(request.user));
    return;
  }

  sendSuccess(response, await listCitizenComplaints(request.user));
});

export const getComplaintByTicketHandler = asyncHandler(async (request, response) => {
  const complaintId = request.params.ticketId || request.params.id;
  if (isLocalDatabaseMode(request)) {
    const complaint = getLocalTicket(complaintId);
    if (!complaint) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    sendSuccess(response, complaint);
    return;
  }

  const complaint = await getComplaintOrThrow(complaintId);
  sendSuccess(response, toPublicComplaint(complaint));
});

export const updateComplaintHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const complaint = await updateLocalComplaint(request.params.id, request.body, request.user);
    if (!complaint) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    request.app.get("io")?.to("admin").emit("complaint:updated", complaint);
    request.app.get("io")?.to(`ticket:${complaint.ticketId}`).emit("complaint:updated", complaint);
    sendSuccess(response, complaint, "Complaint updated");
    return;
  }

  const complaint = await updateComplaint({
    id: request.params.id,
    payload: request.body,
    files: request.files || [],
    actor: request.user,
    io: request.app.get("io"),
    request,
  });
  sendSuccess(response, toPublicComplaint(complaint), "Complaint updated");
});

export const getTimelineHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, getLocalTicketTimeline(request.params.ticketId));
    return;
  }

  sendSuccess(response, await getComplaintTimeline(request.params.ticketId));
});

export const getCitizenProgressHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const progress = getLocalCitizenProgress(request.params.ticketId);
    if (!progress) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    sendSuccess(response, progress);
    return;
  }

  const complaint = await getComplaintOrThrow(request.params.ticketId);
  const [timeline, communications] = await Promise.all([
    getComplaintTimeline(complaint.ticketId),
    listCommunicationHistory(complaint.ticketId),
  ]);
  const publicComplaint = toPublicComplaint(complaint);
  const status = publicComplaint.status;
  sendSuccess(response, {
    ticketId: complaint.ticketId,
    title: complaint.title,
    summary: complaint.summary,
    category: complaint.category,
    priority: complaint.priority || complaint.severity,
    sector: complaint.location?.sector,
    status,
    citizen: publicComplaint.citizen,
    assignedDepartment: complaint.department,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    trackingUrl: buildTrackingLink(complaint.ticketId),
    sla: {
      label: getSlaLabel(complaint),
      dueAt: complaint.sla?.dueAt,
      status: complaint.sla?.status || "active",
      responseHours: complaint.sla?.responseHours,
      remainingSeconds: complaint.sla?.dueAt
        ? Math.max(0, Math.floor((new Date(complaint.sla.dueAt).getTime() - Date.now()) / 1000))
        : null,
      escalationStatus: complaint.sla?.breachedAt ? "Escalated" : "On track",
    },
    tracker: [
      { id: "Received", label: "Received", completed: true },
      { id: "Assigned", label: "Assigned", completed: ["Assigned", "In Progress", "Resolved"].includes(status) },
      { id: "In Progress", label: "In Progress", completed: ["In Progress", "Resolved"].includes(status) },
      { id: "Fixed", label: "Fixed", completed: status === "Resolved" },
    ],
    auditTrail: timeline.map((entry) => ({
      id: entry._id?.toString?.() || entry.id,
      ticketId: entry.ticketId,
      actorId: entry.actor?.toString() || "system",
      actorName: entry.actorName,
      role: entry.actorRole,
      action: entry.action,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      timestamp: entry.createdAt,
    })),
    communications,
    media: publicComplaint.media || [],
    resolutionConfirmedAt: complaint.resolutionConfirmedAt,
    citizenRating: complaint.citizenRating,
    citizenActions: complaint.citizenActions || [],
  });
});

export const getMyComplaintTrackingHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const tracking = getLocalCitizenTracking(request.params.ticketId, request.user);
    if (!tracking) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    sendSuccess(response, tracking);
    return;
  }

  const complaint = await getCitizenComplaintOrThrow(request.params.ticketId, request.user);
  request.params.ticketId = complaint.ticketId;
  return getCitizenProgressHandler(request, response);
});

export const createMyComplaintActionHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const complaint = await addLocalCitizenComplaintAction(
      request.params.ticketId,
      request.body,
      request.user,
    );
    if (!complaint) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    request.app.get("io")?.to("admin").emit("complaint:updated", complaint);
    request.app.get("io")?.to(`ticket:${complaint.ticketId}`).emit("complaint:updated", complaint);
    sendSuccess(response, complaint, "Complaint action saved");
    return;
  }

  sendSuccess(
    response,
    await addCitizenComplaintAction({
      ticketId: request.params.ticketId,
      action: request.body.action,
      note: request.body.note,
      rating: request.body.rating,
      files: request.files || [],
      actor: request.user,
      io: request.app.get("io"),
      request,
    }),
    "Complaint action saved",
  );
});

export const updateStatusHandler = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const complaint = await updateLocalComplaint(
      request.params.ticketId,
      request.body,
      request.user,
    );
    if (!complaint) {
      response.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }
    request.app.get("io")?.to("admin").emit("complaint:updated", complaint);
    request.app.get("io")?.to(`ticket:${complaint.ticketId}`).emit("complaint:updated", complaint);
    sendSuccess(response, complaint, "Complaint status updated");
    return;
  }

  const complaint = await updateComplaintStatus({
    ticketId: request.params.ticketId,
    status: request.body.status,
    actor: request.user,
    note: request.body.note,
    io: request.app.get("io"),
    request,
  });
  sendSuccess(response, toPublicComplaint(complaint), "Complaint status updated");
});
