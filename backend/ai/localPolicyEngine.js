import { detectLocalLanguage, LANG_MAP } from "./languageMap.js";
import { inferCategoryFromText } from "../constants/workflow.js";

const invalidSignals = ["remove the sun", "girlfriend", "boyfriend", "meme", "joke", "asdf", "lorem"];
const abusiveSignals = ["idiot", "stupid", "kill", "hate"];
const criticalSignals = ["fire", "aag", "blast", "collapse", "injured", "danger", "gas"];
const highSignals = ["overflow", "sewage", "water leak", "transformer", "unsafe", "pothole"];

function chooseCategory(text) {
  return inferCategoryFromText(text);
}

function chooseSeverity(text) {
  const lower = text.toLowerCase();
  if (criticalSignals.some((word) => lower.includes(word))) return "Critical";
  if (highSignals.some((word) => lower.includes(word))) return "High";
  return "Medium";
}

export function analyzeWithLocalPolicy(text, knownComplaints = []) {
  const lower = text.toLowerCase();
  const detectedLanguage = detectLocalLanguage(text);
  const category = chooseCategory(text);
  const severity = chooseSeverity(text);
  const abusiveProbability = abusiveSignals.some((word) => lower.includes(word)) ? 0.72 : 0.05;
  const spamProbability = /(.)\1{8,}/.test(lower) || lower.length < 10 ? 0.82 : 0.08;
  const fakeProbability = invalidSignals.some((word) => lower.includes(word)) ? 0.9 : 0.08;
  const duplicateProbability = knownComplaints.some((complaint) =>
    complaint.translatedText?.slice(0, 42).toLowerCase() === lower.slice(0, 42),
  )
    ? 0.82
    : 0.12;
  const isCivicRelated = category !== "Other" || !invalidSignals.some((word) => lower.includes(word));
  const validityStatus =
    !isCivicRelated || spamProbability > 0.75 || fakeProbability > 0.85 || abusiveProbability > 0.85
      ? "invalid"
      : duplicateProbability > 0.75
        ? "needs_review"
        : "valid";

  return {
    provider: "local-policy",
    originalText: text,
    translatedText: text,
    detectedLanguage,
    languageName: LANG_MAP[detectedLanguage] || "English",
    interpretation: `${category} complaint with ${severity.toLowerCase()} severity.`,
    isCivicRelated,
    validityStatus,
    moderationReason: validityStatus === "valid" ? "Civic issue accepted by policy engine." : "Complaint needs moderation review.",
    confidenceScore: validityStatus === "valid" ? 0.78 : 0.62,
    severityLevel: severity,
    priority: severity,
    category,
    spamProbability,
    duplicateProbability,
    abusiveProbability,
    fakeProbability,
    rawResponse: { engine: "local-policy-v1" },
  };
}
