import ComplaintTimeline from "../models/ComplaintTimeline.js";
import ComplaintStatusLog from "../models/ComplaintStatusLog.js";

export const timelineRepository = {
  createTimelineEvent(payload) {
    return ComplaintTimeline.create(payload);
  },

  createStatusLog(payload) {
    return ComplaintStatusLog.create(payload);
  },

  findByTicket(ticketId) {
    return ComplaintTimeline.find({ ticketId }).sort({ createdAt: 1 }).lean();
  },
};
