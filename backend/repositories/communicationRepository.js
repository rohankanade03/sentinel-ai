import CommunicationLog from "../models/CommunicationLog.js";

export const communicationRepository = {
  create(payload) {
    return CommunicationLog.create(payload);
  },

  updateById(id, payload) {
    return CommunicationLog.findByIdAndUpdate(id, payload, { new: true });
  },

  findById(id) {
    return CommunicationLog.findById(id);
  },

  findByProviderMessageId(providerMessageId) {
    if (!providerMessageId) return null;
    return CommunicationLog.findOne({ providerMessageId });
  },

  findLatestByTicketTypeAndEvent(ticketId, type, eventType) {
    return CommunicationLog.findOne({ ticketId, type, eventType }).sort({ createdAt: -1 });
  },

  listByTicket(ticketId) {
    return CommunicationLog.find({ ticketId }).sort({ createdAt: -1 }).limit(100).lean();
  },

  listRecent(limit = 100) {
    return CommunicationLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  },

  async getSummary(ticketId) {
    const logs = await CommunicationLog.find({ ticketId }).sort({ createdAt: -1 }).lean();
    const latestByType = logs.reduce((accumulator, log) => {
      if (!accumulator[log.type]) {
        accumulator[log.type] = log;
      }
      return accumulator;
    }, {});

    return {
      callStatus: latestByType.voice_call?.status,
      whatsappStatus: latestByType.whatsapp?.status,
      smsStatus: latestByType.sms?.status,
      emergencyAlertStatus: latestByType.officer_alert?.status,
      lastUpdatedAt: logs[0]?.updatedAt || logs[0]?.createdAt,
      history: logs.slice(0, 8),
    };
  },
};
