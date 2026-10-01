import { getSlaState, toPublicStatus } from "../constants/workflow.js";
import { createAuditLog } from "./auditLogService.js";
import { addTimelineEvent } from "./timelineService.js";
import { notifyComplaintStatusChanged } from "./notificationService.js";
import { toDashboardComplaint, toPublicComplaint } from "./complaintSerializer.js";

export async function recordComplaintLifecycleEvent({
  complaint,
  actor,
  action,
  eventType = "system",
  fromStatus,
  toStatus,
  note,
  metadata,
  io,
  request,
  notify = false,
}) {
  complaint.sla = {
    ...(complaint.sla?.toObject?.() || complaint.sla || {}),
    status: getSlaState({
      status: complaint.status,
      slaDueAt: complaint.sla?.dueAt,
      resolvedAt: complaint.resolvedAt,
    }),
    resolvedAt: complaint.resolvedAt || complaint.sla?.resolvedAt,
  };

  if (!Array.isArray(complaint.officerActions)) {
    complaint.officerActions = [];
  }

  if (toStatus && actor?.role && actor.role !== "citizen") {
    complaint.officerActions.push({
      officer: actor._id,
      officerName: actor.name,
      action,
      fromStatus,
      toStatus,
      note,
    });
  }

  await complaint.save();

  await Promise.all([
    addTimelineEvent({
      complaint,
      actor,
      action,
      eventType,
      fromStatus,
      toStatus,
      note,
      metadata,
    }),
    createAuditLog({
      complaint,
      actor,
      action,
      eventType,
      fromStatus,
      toStatus,
      note,
      metadata,
      request,
    }),
  ]);

  if (notify) {
    notifyComplaintStatusChanged(complaint, {
      fromStatus: fromStatus ? toPublicStatus(fromStatus) : undefined,
      toStatus: toPublicStatus(toStatus || complaint.status),
    }).catch(() => undefined);
  }

  const populatedComplaint = await complaint.populate("media assignedOfficer");
  io?.to(`ticket:${complaint.ticketId}`).emit("complaint:updated", toPublicComplaint(populatedComplaint));
  io?.to("admin").emit("complaint:updated", toDashboardComplaint(populatedComplaint));

  return populatedComplaint;
}
