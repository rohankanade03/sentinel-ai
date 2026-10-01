import Complaint from "../models/Complaint.js";

export function normalizeLegacyTicket(ticketId = "") {
  if (/^SEN-\d{4}-\d{4}$/i.test(ticketId)) return ticketId.toUpperCase();
  if (/^CF-\d{4}-\d{6}$/i.test(ticketId)) return ticketId.toUpperCase();
  return ticketId;
}

export async function generateTicketId(date = new Date()) {
  const year = date.getFullYear();
  const prefix = `CF-${year}-`;
  const latest = await Complaint.findOne({ ticketId: new RegExp(`^${prefix}`) })
    .sort({ ticketSequence: -1 })
    .select("ticketSequence")
    .lean();
  const nextSequence = (latest?.ticketSequence || 0) + 1;

  return {
    ticketId: `${prefix}${String(nextSequence).padStart(6, "0")}`,
    ticketSequence: nextSequence,
  };
}
