import Notification from "../models/Notification.js";

export const notificationRepository = {
  upsertQueued({ dedupeKey, payload }) {
    return Notification.findOneAndUpdate(
      { dedupeKey },
      { ...payload, dedupeKey, status: "queued" },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },
};
