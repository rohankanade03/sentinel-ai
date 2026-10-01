import twilio from "twilio";
import { env } from "../config/env.js";

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function buildTrackingLink(ticketId) {
  return `${trimSlash(env.trackingBaseUrl)}/track/${encodeURIComponent(ticketId)}`;
}

export function normalizeCommunicationLanguage(language) {
  const value = String(language || "en").toLowerCase();
  if (value.includes("hi") || value.includes("hindi")) return "hi";
  if (value.includes("hinglish") || value.includes("roman")) return "hinglish";
  return "en";
}

export function getSlaLabel(complaint) {
  const hours = Number(complaint.sla?.responseHours || 24);
  if (hours < 1) return "30 minutes";
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

function getCitizenName(complaint) {
  return complaint.citizenSnapshot?.name || "Citizen";
}

function getSummary(complaint) {
  return String(complaint.summary || complaint.originalText || "your civic issue").slice(0, 160);
}

export function buildVoiceConfirmationText(complaint, language = "en") {
  const normalizedLanguage = normalizeCommunicationLanguage(language);
  const ticketId = complaint.ticketId;
  const sla = getSlaLabel(complaint);
  const priority = complaint.priority || complaint.severity || "Medium";
  const category = complaint.category || "civic";
  const name = getCitizenName(complaint);
  const summary = getSummary(complaint);

  if (normalizedLanguage === "hi") {
    return `Namaste ${name}. Aapki ${category} shikayat safalta se register ho gayi hai. Ticket ID hai ${ticketId}. Priority ${priority} hai. Vivaran: ${summary}. Expected resolution time ${sla} hai. Aap tracking link se status dekh sakte hain. Dhanyavaad.`;
  }

  if (normalizedLanguage === "hinglish") {
    return `Namaste ${name}. Aapki ${category} complaint successfully register ho gayi hai. Ticket ID hai ${ticketId}. Priority ${priority} hai. Summary: ${summary}. Expected resolution time ${sla} hai. Tracking link par status check kar sakte hain. Thank you.`;
  }

  return `Hello ${name}. Your ${category} complaint has been registered successfully. Your ticket ID is ${ticketId}. Priority is ${priority}. Complaint summary: ${summary}. Expected resolution time is ${sla}. You can track your complaint using the tracking link. Thank you.`;
}

export function buildVoiceTwiml(complaint, language = "en") {
  const normalizedLanguage = normalizeCommunicationLanguage(language);
  const voiceResponse = new twilio.twiml.VoiceResponse();
  voiceResponse.say(
    {
      language: normalizedLanguage === "en" ? "en-IN" : "hi-IN",
      voice: "alice",
    },
    buildVoiceConfirmationText(complaint, normalizedLanguage),
  );
  return voiceResponse.toString();
}

export function buildCitizenConfirmationMessage(complaint, language = "en") {
  const normalizedLanguage = normalizeCommunicationLanguage(language);
  const trackingUrl = buildTrackingLink(complaint.ticketId);
  const sla = getSlaLabel(complaint);
  const priority = complaint.priority || complaint.severity || "Medium";
  const summary = getSummary(complaint);

  if (normalizedLanguage === "hi" || normalizedLanguage === "hinglish") {
    return [
      `CivicFlow confirmation`,
      `Ticket ID: ${complaint.ticketId}`,
      `Category: ${complaint.category}`,
      `Priority: ${priority}`,
      `Summary: ${summary}`,
      `Expected resolution: ${sla}`,
      `Track: ${trackingUrl}`,
    ].join("\n");
  }

  return [
    `CivicFlow complaint confirmation`,
    `Ticket ID: ${complaint.ticketId}`,
    `Category: ${complaint.category}`,
    `Priority: ${priority}`,
    `Summary: ${summary}`,
    `Expected resolution: ${sla}`,
    `Track: ${trackingUrl}`,
  ].join("\n");
}

export function buildEmergencyOfficerMessage(complaint) {
  return [
    `Emergency CivicFlow alert`,
    `Ticket: ${complaint.ticketId}`,
    `Priority: ${complaint.priority || complaint.severity}`,
    `Category: ${complaint.category}`,
    `Location: ${complaint.location?.address || complaint.location?.sector || "Unmapped"}`,
    `SLA: ${getSlaLabel(complaint)}`,
    `Track: ${buildTrackingLink(complaint.ticketId)}`,
  ].join("\n");
}
