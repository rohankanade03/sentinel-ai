import Complaint from "../models/Complaint.js";
import { normalizeLegacyTicket } from "../utils/ticket.js";

function ticketQuery(identifier) {
  const normalized = normalizeLegacyTicket(identifier);
  const matchesObjectId = /^[a-f\d]{24}$/i.test(String(identifier));
  const query = {
    $or: [{ ticketId: normalized }, { legacyTicketId: normalized }],
  };

  if (matchesObjectId) {
    query.$or.push({ _id: identifier });
  }

  return query;
}

export const complaintRepository = {
  create(payload) {
    return Complaint.create(payload);
  },

  findRecentSince(date) {
    return Complaint.find({ createdAt: { $gte: date } }).select("translatedText").lean();
  },

  findByTicket(identifier) {
    return Complaint.findOne(ticketQuery(identifier)).populate("assignedOfficer media");
  },

  listForDashboard(limit = 500) {
    return Complaint.find().sort({ createdAt: -1 }).limit(limit).populate("media assignedOfficer");
  },

  listPublic(limit = 500) {
    return Complaint.find().sort({ createdAt: -1 }).limit(limit).populate("media");
  },

  listForCitizen(user, limit = 200) {
    const userId = user?._id || user?.id;
    const matches = [];

    if (userId) matches.push({ citizen: userId });
    if (user?.email) matches.push({ "citizenSnapshot.email": user.email });
    if (user?.phone) matches.push({ "citizenSnapshot.phone": user.phone });

    if (!matches.length) return [];

    return Complaint.find({ $or: matches })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("media assignedOfficer");
  },

  aggregate(pipeline) {
    return Complaint.aggregate(pipeline);
  },
};
