import twilio from "twilio";
import { env } from "../config/env.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { buildTrackingLink } from "./communicationMessageService.js";

export function buildComplaintMessage({ ticketId, category, status, language = "en", eventType = "complaint_registered" }) {
  const link = buildTrackingLink(ticketId);
  const statusLine = eventType === "status_changed" ? "has been updated" : "has been registered successfully";
  if (language === "hi" || language === "hinglish") {
    return `Aapki CivicFlow complaint update ho gayi hai.\nTicket ID: ${ticketId}\nCategory: ${category}\nStatus: ${status}\nTrack: ${link}`;
  }
  return `Your CivicFlow complaint ${statusLine}.\nTicket ID: ${ticketId}\nCategory: ${category}\nStatus: ${status}\nTrack your complaint here:\n${link}`;
}

export async function queueNotification({ complaint, channel, phone, template, language, eventType = "complaint_registered" }) {
  const message = buildComplaintMessage({
    ticketId: complaint.ticketId,
    category: complaint.category,
    status: complaint.status,
    language,
    eventType,
  });
  const dedupeKey = `${complaint.ticketId}:${channel}:${template}`;

  return notificationRepository.upsertQueued({
    dedupeKey,
    payload: {
      complaint: complaint._id,
      ticketId: complaint.ticketId,
      recipientPhone: phone,
      channel,
      language,
      template,
      message,
      eventType,
    },
  });
}

export async function sendQueuedNotification(notification) {
  if (!env.twilioSid || !env.twilioToken) {
    notification.status = "skipped";
    notification.lastError = "Twilio is not configured.";
    await notification.save();
    return notification;
  }

  const client = twilio(env.twilioSid, env.twilioToken);
  const from =
    notification.channel === "whatsapp" ? env.twilioWhatsappFrom : env.twilioSmsFrom;
  const to =
    notification.channel === "whatsapp"
      ? `whatsapp:${notification.recipientPhone}`
      : notification.recipientPhone;

  try {
    const result = await client.messages.create({ from, to, body: notification.message });
    notification.providerMessageId = result.sid;
    notification.status = "sent";
    notification.sentAt = new Date();
  } catch (error) {
    notification.status = "failed";
    notification.lastError = error.message;
  }

  notification.attempts += 1;
  await notification.save();
  return notification;
}

export async function notifyComplaintRegistered(complaint) {
  const phone = complaint.citizenSnapshot?.phone;
  if (!phone) return [];

  const records = await Promise.all([
    queueNotification({ complaint, channel: "sms", phone, template: "complaint_registered", language: complaint.detectedLanguage }),
    queueNotification({ complaint, channel: "whatsapp", phone, template: "complaint_registered", language: complaint.detectedLanguage }),
  ]);

  return Promise.all(records.map(sendQueuedNotification));
}

export async function notifyComplaintStatusChanged(complaint) {
  const phone = complaint.citizenSnapshot?.phone;
  if (!phone) return [];

  const records = await Promise.all([
    queueNotification({
      complaint,
      channel: "sms",
      phone,
      template: `status_changed:${complaint.status}`,
      language: complaint.detectedLanguage,
      eventType: "status_changed",
    }),
    queueNotification({
      complaint,
      channel: "whatsapp",
      phone,
      template: `status_changed:${complaint.status}`,
      language: complaint.detectedLanguage,
      eventType: "status_changed",
    }),
  ]);

  return Promise.all(records.map(sendQueuedNotification));
}
