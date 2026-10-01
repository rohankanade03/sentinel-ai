import { auditLogRepository } from "../repositories/auditLogRepository.js";

export function toAuditLogResponse(entry) {
  const complaint = entry.complaint || {};
  const location = complaint.location || {};

  return {
    id: entry._id?.toString?.() || entry.id,
    ticketId: entry.ticketId,
    actorId: entry.actor?.toString?.() || entry.actorId || "system",
    actorName: entry.actorName,
    role: entry.actorRole,
    action: entry.action,
    eventType: entry.eventType,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note,
    metadata: entry.metadata,
    timestamp: entry.createdAt,
    complaintTitle: complaint.title,
    category: complaint.category,
    sector: location.sector,
    currentStatus: complaint.status,
    assignedDepartment: complaint.department,
  };
}

export function createAuditLog({
  complaint,
  actor,
  action,
  eventType = "system",
  fromStatus,
  toStatus,
  note,
  metadata,
  request,
}) {
  return auditLogRepository.create({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    actor: actor?._id,
    actorId: actor?._id?.toString?.(),
    actorName: actor?.name || "System",
    actorRole: actor?.role || "system",
    action,
    eventType,
    fromStatus,
    toStatus,
    note,
    metadata,
    ipAddress: request?.ip,
    userAgent: request?.get?.("user-agent"),
  });
}

export async function listAuditLogs() {
  const entries = await auditLogRepository.list();
  return entries.map(toAuditLogResponse);
}
