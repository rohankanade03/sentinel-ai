import { getComplaintOrThrow, getComplaintTimeline } from "../services/complaintService.js";
import { buildTrackingLink, getSlaLabel } from "../services/communicationMessageService.js";
import { listCommunicationHistory } from "../services/communicationService.js";
import { toPublicComplaint } from "../services/complaintSerializer.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function getRemainingSeconds(dueAt) {
  if (!dueAt) return null;
  return Math.max(0, Math.floor((new Date(dueAt).getTime() - Date.now()) / 1000));
}

function toAuditTrail(timeline) {
  return timeline.map((entry) => ({
    id: entry._id?.toString?.() || entry.id,
    ticketId: entry.ticketId,
    actorId: entry.actor?.toString?.() || "system",
    actorName: entry.actorName,
    role: entry.actorRole,
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note,
    timestamp: entry.createdAt,
  }));
}

export const getTrackingHandler = asyncHandler(async (request, response) => {
  const complaint = await getComplaintOrThrow(request.params.ticketId);
  const publicComplaint = toPublicComplaint(complaint);
  const [timeline, communications] = await Promise.all([
    getComplaintTimeline(complaint.ticketId),
    listCommunicationHistory(complaint.ticketId),
  ]);

  const status = publicComplaint.status;

  sendSuccess(response, {
    ticketId: complaint.ticketId,
    title: complaint.title,
    summary: complaint.summary,
    category: complaint.category,
    priority: complaint.priority || complaint.severity,
    sector: complaint.location?.sector,
    location: publicComplaint.location,
    status,
    citizen: publicComplaint.citizen,
    assignedDepartment: complaint.department,
    assignedOfficer: complaint.assignedOfficer?.name,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    trackingUrl: buildTrackingLink(complaint.ticketId),
    sla: {
      label: getSlaLabel(complaint),
      dueAt: complaint.sla?.dueAt,
      status: complaint.sla?.status || "active",
      responseHours: complaint.sla?.responseHours,
      remainingSeconds: getRemainingSeconds(complaint.sla?.dueAt),
      escalationStatus: complaint.sla?.breachedAt ? "Escalated" : "On track",
    },
    tracker: [
      { id: "Received", label: "Received", completed: true },
      { id: "Assigned", label: "Assigned", completed: ["Assigned", "In Progress", "Resolved"].includes(status) },
      { id: "In Progress", label: "In Progress", completed: ["In Progress", "Resolved"].includes(status) },
      { id: "Fixed", label: "Fixed", completed: status === "Resolved" },
    ],
    officerActions: complaint.officerActions || [],
    auditTrail: toAuditTrail(timeline),
    communications,
  });
});
