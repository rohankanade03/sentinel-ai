import { timelineRepository } from "../repositories/timelineRepository.js";

export async function addTimelineEvent({
  complaint,
  actor,
  action,
  eventType = "system",
  fromStatus,
  toStatus,
  note,
  metadata,
}) {
  const event = await timelineRepository.createTimelineEvent({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    actor: actor?._id,
    actorName: actor?.name || "System",
    actorRole: actor?.role || "system",
    action,
    eventType,
    fromStatus,
    toStatus,
    note,
    metadata,
  });

  if (toStatus) {
    await timelineRepository.createStatusLog({
      complaint: complaint._id,
      ticketId: complaint.ticketId,
      fromStatus,
      toStatus,
      changedBy: actor?._id,
      changedByName: actor?.name || "System",
      reason: note,
    });
  }

  return event;
}

export function getTimeline(ticketId) {
  return timelineRepository.findByTicket(ticketId);
}
