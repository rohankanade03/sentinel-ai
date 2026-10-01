import twilio from "twilio";
import { env } from "../config/env.js";
import Officer from "../models/Officer.js";
import User from "../models/User.js";
import { complaintRepository } from "../repositories/complaintRepository.js";
import { communicationRepository } from "../repositories/communicationRepository.js";
import { ApiError } from "../utils/ApiError.js";
import {
  buildCitizenConfirmationMessage,
  buildEmergencyOfficerMessage,
  buildTrackingLink,
  buildVoiceTwiml,
  normalizeCommunicationLanguage,
} from "./communicationMessageService.js";

const FAILED_CALL_STATUSES = new Set(["failed", "no-answer", "busy", "canceled"]);
const EMERGENCY_PRIORITIES = new Set(["high", "critical", "emergency"]);
const MESSAGE_ATTEMPTED_STATUSES = new Set([
  "queued",
  "accepted",
  "processing",
  "sending",
  "sent",
  "delivered",
  "read",
]);
const FAILED_MESSAGE_STATUSES = new Set(["failed", "undelivered"]);

function getTwilioClient() {
  if (!env.twilioSid || !env.twilioToken) return null;
  return twilio(env.twilioSid, env.twilioToken);
}

function normalizePhone(phone) {
  const rawPhone = String(phone || "").trim();
  if (!rawPhone) return "";

  const withoutSeparators = rawPhone.replace(/[()\s-]/g, "");
  if (withoutSeparators.startsWith("+")) return withoutSeparators;
  if (withoutSeparators.startsWith("00")) return `+${withoutSeparators.slice(2)}`;

  const digits = withoutSeparators.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${env.defaultPhoneCountryCode}${digits}`;
  if (digits.length === 12 && digits.startsWith(env.defaultPhoneCountryCode.replace("+", ""))) {
    return `+${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function normalizeWhatsappFrom(from) {
  if (!from) return "";
  return from.startsWith("whatsapp:") ? from : `whatsapp:${normalizePhone(from)}`;
}

function isCommunicationConfigured(type) {
  if (!env.communicationEnabled) return false;
  if (!env.twilioSid || !env.twilioToken) return false;
  if (type === "voice_call") return Boolean(env.twilioVoiceFrom);
  if (type === "whatsapp") return Boolean(env.twilioWhatsappFrom);
  if (type === "sms" || type === "officer_alert") return Boolean(env.twilioSmsFrom);
  return true;
}

function emitCommunication(io, log) {
  if (!log) return;
  const payload = log.toObject ? log.toObject() : log;
  io?.to("admin").emit("communication:updated", payload);
  io?.to(`ticket:${payload.ticketId}`).emit("communication:updated", payload);
}

function isMessageAttempted(log) {
  return Boolean(log && MESSAGE_ATTEMPTED_STATUSES.has(log.status));
}

async function runChannel(task) {
  try {
    return await task();
  } catch (error) {
    console.error("[communications] channel failed", error);
    return error;
  }
}

async function createSkippedLog({ complaint, type, audience = "citizen", phone, message, language, eventType, reason }) {
  return communicationRepository.create({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    type,
    audience,
    recipientPhone: phone,
    status: "skipped",
    attempts: 0,
    maxAttempts: env.communicationRetryAttempts,
    language,
    message,
    trackingUrl: buildTrackingLink(complaint.ticketId),
    eventType,
    priority: complaint.priority || complaint.severity,
    category: complaint.category,
    lastError: reason,
  });
}

export async function createTrackingCommunicationLog(complaint) {
  const existingSummary = await communicationRepository.getSummary(complaint.ticketId);
  if (existingSummary.history?.some((log) => log.type === "tracking_link")) {
    return null;
  }

  return communicationRepository.create({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    type: "tracking_link",
    audience: "citizen",
    provider: "civicflow",
    status: "delivered",
    message: "Secure tracking link generated.",
    trackingUrl: buildTrackingLink(complaint.ticketId),
    eventType: "tracking_link_generated",
    priority: complaint.priority || complaint.severity,
    category: complaint.category,
    sentAt: new Date(),
    deliveredAt: new Date(),
  });
}

export async function placeConfirmationCall({ complaint, attempt = 1, io = null }) {
  const phone = normalizePhone(complaint.citizenSnapshot?.phone);
  const language = normalizeCommunicationLanguage(complaint.detectedLanguage || complaint.citizen?.preferredLanguage);
  const message = buildCitizenConfirmationMessage(complaint, language);

  if (!phone) {
    const log = await createSkippedLog({
      complaint,
      type: "voice_call",
      phone,
      message,
      language,
      eventType: "complaint_registered",
      reason: "Citizen phone number is missing.",
    });
    emitCommunication(io, log);
    return log;
  }

  if (!isCommunicationConfigured("voice_call")) {
    const log = await createSkippedLog({
      complaint,
      type: "voice_call",
      phone,
      message,
      language,
      eventType: "complaint_registered",
      reason: "Twilio Voice is not configured.",
    });
    emitCommunication(io, log);
    return log;
  }

  const log = await communicationRepository.create({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    type: "voice_call",
    audience: "citizen",
    recipientPhone: phone,
    status: "processing",
    attempts: attempt,
    maxAttempts: env.communicationRetryAttempts,
    language,
    message,
    trackingUrl: buildTrackingLink(complaint.ticketId),
    eventType: "complaint_registered",
    priority: complaint.priority || complaint.severity,
    category: complaint.category,
  });

  try {
    const client = getTwilioClient();
    const callbackUrl = `${String(env.communicationWebhookBaseUrl).replace(/\/+$/, "")}/api/communications/twilio/voice-status?logId=${log._id}`;
    const result = await client.calls.create({
      to: phone,
      from: env.twilioVoiceFrom,
      twiml: buildVoiceTwiml(complaint, language),
      statusCallback: callbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      machineDetection: "Enable",
    });

    log.providerMessageId = result.sid;
    log.status = "sent";
    log.sentAt = new Date();
    await log.save();
  } catch (error) {
    log.status = "failed";
    log.lastError = error.message;
    await log.save();
  }

  emitCommunication(io, log);
  return log;
}

async function sendMessage({ complaint, type, audience = "citizen", phone, message, language, eventType, io }) {
  const channelFrom = type === "whatsapp" ? normalizeWhatsappFrom(env.twilioWhatsappFrom) : env.twilioSmsFrom;
  const to = type === "whatsapp" ? `whatsapp:${normalizePhone(phone)}` : phone;
  const from = type === "whatsapp" ? normalizeWhatsappFrom(env.twilioWhatsappFrom) : env.twilioSmsFrom;

  if (!phone) {
    const log = await createSkippedLog({
      complaint,
      type,
      audience,
      phone,
      message,
      language,
      eventType,
      reason: `${audience} phone number is missing.`,
    });
    emitCommunication(io, log);
    return log;
  }

  if (!channelFrom || !isCommunicationConfigured(type === "officer_alert" ? "sms" : type)) {
    const log = await createSkippedLog({
      complaint,
      type,
      audience,
      phone,
      message,
      language,
      eventType,
      reason: `${type} provider is not configured.`,
    });
    emitCommunication(io, log);
    return log;
  }

  const log = await communicationRepository.create({
    complaint: complaint._id,
    ticketId: complaint.ticketId,
    type,
    audience,
    recipientPhone: phone,
    status: "processing",
    attempts: 1,
    maxAttempts: type === "voice_call" ? env.communicationRetryAttempts : 1,
    language,
    message,
    trackingUrl: buildTrackingLink(complaint.ticketId),
    eventType,
    priority: complaint.priority || complaint.severity,
    category: complaint.category,
  });

  try {
    const client = getTwilioClient();
    console.info("[communications] sending message", {
      ticketId: complaint.ticketId,
      type,
      eventType,
      from,
      to,
    });
    const callbackUrl = `${String(env.communicationWebhookBaseUrl).replace(/\/+$/, "")}/api/communications/twilio/message-status?logId=${log._id}`;
    const result = await client.messages.create({
      from,
      to,
      body: message,
      statusCallback: callbackUrl,
    });
    log.providerMessageId = result.sid;
    log.status = "sent";
    log.sentAt = new Date();
    console.info("[communications] message accepted by Twilio", {
      ticketId: complaint.ticketId,
      type,
      providerMessageId: result.sid,
      status: result.status,
    });
  } catch (error) {
    log.status = "failed";
    log.lastError = [error.message, error.code ? `code=${error.code}` : "", error.status ? `status=${error.status}` : ""]
      .filter(Boolean)
      .join(" | ");
    console.error("[communications] Twilio message failed", {
      ticketId: complaint.ticketId,
      type,
      eventType,
      from,
      to,
      error: log.lastError,
      moreInfo: error.moreInfo,
    });
  }

  await log.save();
  emitCommunication(io, log);
  return log;
}

export function sendCitizenWhatsApp({ complaint, eventType = "complaint_registered", io = null }) {
  const language = normalizeCommunicationLanguage(complaint.detectedLanguage || complaint.citizen?.preferredLanguage);
  const phone = normalizePhone(complaint.citizenSnapshot?.phone || complaint.citizen?.phone);

  return communicationRepository
    .findLatestByTicketTypeAndEvent(complaint.ticketId, "whatsapp", eventType)
    .then((existingLog) => {
      if (existingLog && (isMessageAttempted(existingLog) || existingLog.status === "processing")) {
        return existingLog;
      }

      return sendMessage({
        complaint,
        type: "whatsapp",
        phone,
        message: buildCitizenConfirmationMessage(complaint, language),
        language,
        eventType,
        io,
      });
    });
}

export function sendCitizenSmsFallback({
  complaint,
  eventType = "fallback_confirmation",
  io = null,
}) {
  const language = normalizeCommunicationLanguage(complaint.detectedLanguage || complaint.citizen?.preferredLanguage);
  return sendMessage({
    complaint,
    type: "sms",
    phone: normalizePhone(complaint.citizenSnapshot?.phone),
    message: buildCitizenConfirmationMessage(complaint, language),
    language,
    eventType,
    io,
  });
}

export async function sendCitizenMessageWithFallback({
  complaint,
  eventType = "complaint_registered",
  io = null,
}) {
  const whatsappLog = await sendCitizenWhatsApp({ complaint, eventType, io });

  if (isMessageAttempted(whatsappLog)) {
    return [whatsappLog];
  }

  const smsLog = await sendCitizenSmsFallback({
    complaint,
    eventType: "fallback_confirmation",
    io,
  });

  return [whatsappLog, smsLog].filter(Boolean);
}

export async function notifyEmergencyOfficers({ complaint, io = null }) {
  const priority = String(complaint.priority || complaint.severity || "").toLowerCase();
  if (!EMERGENCY_PRIORITIES.has(priority)) return [];

  const [officers, admins] = await Promise.all([
    Officer.find({
      isAvailable: true,
      $or: [{ department: complaint.department }, { ward: complaint.location?.ward }],
    })
      .limit(10)
      .lean(),
    User.find({ role: { $in: ["admin", "officer"] }, isActive: true })
      .select("name phone role department ward")
      .limit(20)
      .lean(),
  ]);

  const recipients = [...officers, ...admins]
    .filter((person) => person.phone)
    .filter(
      (person, index, list) =>
        list.findIndex((candidate) => candidate.phone === person.phone) === index,
    );

  const message = buildEmergencyOfficerMessage(complaint);
  io?.to("admin").emit("emergency:alert", {
    ticketId: complaint.ticketId,
    priority: complaint.priority,
    category: complaint.category,
    message,
    trackingUrl: buildTrackingLink(complaint.ticketId),
  });

  if (!recipients.length) {
    const log = await createSkippedLog({
      complaint,
      type: "officer_alert",
      audience: "officer",
      message,
      eventType: "emergency_alert",
      reason: "No officer or admin phone numbers are available.",
    });
    emitCommunication(io, log);
    return [log];
  }

  return Promise.all(
    recipients.map((recipient) =>
      sendMessage({
        complaint,
        type: "officer_alert",
        audience: recipient.role === "admin" ? "admin" : "officer",
        phone: normalizePhone(recipient.phone),
        message,
        language: "en",
        eventType: "emergency_alert",
        io,
      }),
    ),
  );
}

export async function processComplaintCommunication(complaintOrId, { io = null } = {}) {
  const complaint =
    typeof complaintOrId === "string" || complaintOrId?._bsontype === "ObjectId"
      ? await complaintRepository.findByTicket(complaintOrId)
      : complaintOrId;

  if (!complaint) return [];

  const trackingLog = await createTrackingCommunicationLog(complaint);
  if (trackingLog) emitCommunication(io, trackingLog);

  const results = await Promise.all([
    runChannel(() => placeConfirmationCall({ complaint, io })),
    runChannel(() => sendCitizenMessageWithFallback({ complaint, io })),
    runChannel(() => notifyEmergencyOfficers({ complaint, io })),
  ]);

  return [trackingLog, ...results.flat()].filter(Boolean);
}

export function startComplaintCommunicationWorkflow(complaint, { io = null } = {}) {
  setImmediate(() => {
    processComplaintCommunication(complaint, { io }).catch((error) => {
      console.error("[communications] workflow failed", error);
    });
  });
}

async function sendEphemeralMessage({ type, phone, message }) {
  const client = getTwilioClient();
  if (!client) return false;

  if (type === "whatsapp") {
    if (!isCommunicationConfigured("whatsapp")) return false;

    await client.messages.create({
      from: normalizeWhatsappFrom(env.twilioWhatsappFrom),
      to: `whatsapp:${phone}`,
      body: message,
    });
    return true;
  }

  if (!isCommunicationConfigured("sms")) return false;

  await client.messages.create({
    from: env.twilioSmsFrom,
    to: phone,
    body: message,
  });
  return true;
}

export async function sendEphemeralCitizenConfirmation(complaint) {
  const phone = normalizePhone(
    complaint.citizenSnapshot?.phone || complaint.citizen?.phone,
  );
  const history = [];
  const now = () => new Date().toISOString();

  if (!phone) {
    return {
      callStatus: "skipped",
      whatsappStatus: "skipped",
      smsStatus: "skipped",
      lastUpdatedAt: now(),
      history: [
        {
          id: `${complaint.ticketId}-local-phone-missing`,
          ticketId: complaint.ticketId,
          type: "voice_call",
          audience: "citizen",
          status: "skipped",
          lastError: "Citizen phone number is missing.",
          createdAt: now(),
        },
      ],
    };
  }

  const normalizedComplaint = {
    ...complaint,
    citizenSnapshot: {
      ...(complaint.citizenSnapshot || {}),
      ...(complaint.citizen || {}),
      phone,
    },
    priority: complaint.priority || complaint.urgency || complaint.severity || "Medium",
  };
  const language = normalizeCommunicationLanguage(
    normalizedComplaint.detectedLanguage ||
      normalizedComplaint.citizen?.preferredLanguage,
  );
  const message = buildCitizenConfirmationMessage(normalizedComplaint, language);
  let callStatus;
  let whatsappStatus;
  let smsStatus;

  if (isCommunicationConfigured("voice_call")) {
    try {
      const client = getTwilioClient();
      await client.calls.create({
        to: phone,
        from: env.twilioVoiceFrom,
        twiml: buildVoiceTwiml(normalizedComplaint, language),
        machineDetection: "Enable",
      });
      callStatus = "sent";
    } catch (error) {
      callStatus = "failed";
      history.push({
        id: `${complaint.ticketId}-local-call`,
        ticketId: complaint.ticketId,
        type: "voice_call",
        audience: "citizen",
        status: "failed",
        lastError: error.message,
        createdAt: now(),
      });
      console.error("[communications] local confirmation call failed", error);
    }
  } else {
    callStatus = "skipped";
    history.push({
      id: `${complaint.ticketId}-local-call-skipped`,
      ticketId: complaint.ticketId,
      type: "voice_call",
      audience: "citizen",
      status: "skipped",
      lastError: "Twilio Voice is not configured.",
      createdAt: now(),
    });
  }

  try {
    const whatsappSent = await sendEphemeralMessage({
      type: "whatsapp",
      phone,
      message,
    });
    whatsappStatus = whatsappSent ? "sent" : "skipped";

    if (!whatsappSent) {
      const smsSent = await sendEphemeralMessage({ type: "sms", phone, message });
      smsStatus = smsSent ? "sent" : "skipped";
    }
  } catch (error) {
    whatsappStatus = "failed";
    history.push({
      id: `${complaint.ticketId}-local-whatsapp`,
      ticketId: complaint.ticketId,
      type: "whatsapp",
      audience: "citizen",
      status: "failed",
      lastError: error.message,
      createdAt: now(),
    });
    console.error("[communications] local WhatsApp confirmation failed", error);
    try {
      const smsSent = await sendEphemeralMessage({ type: "sms", phone, message });
      smsStatus = smsSent ? "sent" : "skipped";
    } catch (smsError) {
      smsStatus = "failed";
      history.push({
        id: `${complaint.ticketId}-local-sms`,
        ticketId: complaint.ticketId,
        type: "sms",
        audience: "citizen",
        status: "failed",
        lastError: smsError.message,
        createdAt: now(),
      });
      console.error("[communications] local SMS fallback failed", smsError);
    }
  }

  return {
    callStatus,
    whatsappStatus,
    smsStatus,
    lastUpdatedAt: now(),
    history,
  };
}

export function startEphemeralCitizenConfirmationWorkflow(complaint) {
  setImmediate(() => {
    sendEphemeralCitizenConfirmation(complaint).catch((error) => {
      console.error("[communications] local workflow failed", error);
    });
  });
}

async function retryVoiceCall(log, io) {
  const complaint = await complaintRepository.findByTicket(log.ticketId);
  if (!complaint) return null;
  return placeConfirmationCall({ complaint, attempt: log.attempts + 1, io });
}

async function runFallback(log, io) {
  const complaint = await complaintRepository.findByTicket(log.ticketId);
  if (!complaint) return null;
  await sendCitizenSmsFallback({ complaint, io });
  return sendCitizenWhatsApp({ complaint, eventType: "fallback_confirmation", io });
}

export async function handleVoiceStatusWebhook({ request, io = null }) {
  const signature = request.headers["x-twilio-signature"];
  if (env.twilioToken && signature) {
    const callbackUrl = `${String(env.communicationWebhookBaseUrl).replace(/\/+$/, "")}${request.originalUrl}`;
    const valid = twilio.validateRequest(env.twilioToken, signature, callbackUrl, request.body);
    if (!valid && env.nodeEnv === "production") {
      throw new ApiError(403, "Invalid Twilio signature.");
    }
  }

  const logId = request.query.logId;
  const callSid = request.body.CallSid;
  const callStatus = request.body.CallStatus || request.body.CallStatusCallbackEvent || "processing";
  const log =
    (logId && (await communicationRepository.findById(logId))) ||
    (callSid && (await communicationRepository.findByProviderMessageId(callSid)));

  if (!log) {
    throw new ApiError(404, "Communication log not found.");
  }

  log.providerMessageId = callSid || log.providerMessageId;
  log.status = callStatus === "in-progress" ? "answered" : callStatus;
  log.durationSeconds = Number(request.body.CallDuration || log.durationSeconds || 0);
  log.completedAt = ["completed", "failed", "busy", "no-answer", "canceled"].includes(log.status)
    ? new Date()
    : log.completedAt;

  if (FAILED_CALL_STATUSES.has(log.status)) {
    if (log.attempts < log.maxAttempts) {
      log.status = "retrying";
      log.nextRetryAt = new Date(Date.now() + env.communicationRetryDelayMs);
      setTimeout(() => retryVoiceCall(log, io), env.communicationRetryDelayMs);
    } else {
      setImmediate(() => runFallback(log, io));
    }
  }

  await log.save();
  emitCommunication(io, log);
  return log;
}

export async function handleMessageStatusWebhook({ request, io = null }) {
  const signature = request.headers["x-twilio-signature"];
  if (env.twilioToken && signature) {
    const callbackUrl = `${String(env.communicationWebhookBaseUrl).replace(/\/+$/, "")}${request.originalUrl}`;
    const valid = twilio.validateRequest(env.twilioToken, signature, callbackUrl, request.body);
    if (!valid && env.nodeEnv === "production") {
      throw new ApiError(403, "Invalid Twilio signature.");
    }
  }

  const logId = request.query.logId;
  const messageSid = request.body.MessageSid || request.body.SmsSid;
  const log =
    (logId && (await communicationRepository.findById(logId))) ||
    (messageSid && (await communicationRepository.findByProviderMessageId(messageSid)));

  if (!log) {
    throw new ApiError(404, "Communication log not found.");
  }

  log.providerMessageId = messageSid || log.providerMessageId;
  log.status = request.body.MessageStatus || request.body.SmsStatus || log.status;
  log.deliveredAt = ["delivered", "read"].includes(log.status)
    ? new Date()
    : log.deliveredAt;
  log.completedAt = ["delivered", "read", "failed", "undelivered"].includes(log.status)
    ? new Date()
    : log.completedAt;
  await log.save();

  if (
    log.type === "whatsapp" &&
    FAILED_MESSAGE_STATUSES.has(log.status) &&
    log.eventType !== "fallback_confirmation"
  ) {
    setImmediate(() => {
      runFallback(log, io).catch((error) => {
        console.error("[communications] WhatsApp fallback failed", error);
      });
    });
  }

  emitCommunication(io, log);
  return log;
}

export function listCommunicationHistory(ticketId) {
  return communicationRepository.listByTicket(ticketId);
}

export function getCommunicationSummary(ticketId) {
  return communicationRepository.getSummary(ticketId);
}
