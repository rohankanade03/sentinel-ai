import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { analyzeWithLocalPolicy } from "../ai/localPolicyEngine.js";
import {
  inferCategoryFromText,
  normalizeComplaintCategory,
} from "../constants/workflow.js";
import { ApiError } from "../utils/ApiError.js";

const prompt = `You are CivicFlow AI for Indian municipal complaints. Return strict JSON with:
translatedText, detectedLanguage, languageName, interpretation, isCivicRelated, validityStatus(valid|invalid|needs_review), moderationReason, confidenceScore, severityLevel(Low|Medium|High|Critical), priority(Low|Medium|High|Critical), category, spamProbability, duplicateProbability, abusiveProbability, fakeProbability.`;

const imageValidationPrompt = `You validate civic complaint evidence images. Compare the actual image with the complaint text and category.
Return strict JSON only with this shape:
{"valid":true,"relevant":true,"confidence":0.91,"reason":"...","detected_issue":"..."}
Set valid and relevant to false when the image is blank, corrupted, unusable, clearly random, spam, unrelated, or does not provide meaningful evidence for the claimed civic issue. Do not reject merely because the issue is partially visible, dark, blurry, low quality, or viewed from another angle. Accept only when there is sufficient visual evidence that the image relates to the complaint. The image must be judged against the complaint, not by object classification alone.`;

function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response was not JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

function isReadableImage(file) {
  if (!file?.buffer?.length || !file.mimetype) return false;
  const bytes = file.buffer;
  if (file.mimetype === "image/jpeg") {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  }
  if (file.mimetype === "image/png") {
    return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function normalizeImageValidation(result) {
  if (!result || typeof result !== "object") throw new Error("AI image validation response was invalid.");

  const confidence = Number(result.confidence);
  if (typeof result.valid !== "boolean" || typeof result.relevant !== "boolean" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || typeof result.reason !== "string" || !result.reason.trim()) {
    throw new Error("AI image validation response did not match the required schema.");
  }

  return {
    valid: result.valid,
    relevant: result.relevant,
    confidence,
    reason: result.reason.trim(),
    detectedIssue: typeof result.detected_issue === "string" ? result.detected_issue.trim() : "unknown",
  };
}

function getVisionProviderConfig() {
  if (env.openaiApiKey) {
    return {
      provider: "openai",
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      keyConfigured: true,
      keyLength: env.openaiApiKey.length,
    };
  }

  if (env.geminiApiKey) {
    return {
      provider: "gemini",
      model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash",
      keyConfigured: true,
      keyLength: env.geminiApiKey.length,
    };
  }

  return {
    provider: "none",
    model: "none",
    keyConfigured: false,
    keyLength: 0,
  };
}

function sanitizeProviderError(error, keys = []) {
  return keys.filter(Boolean).reduce(
    (message, key) => message.replaceAll(key, "[redacted]"),
    String(error?.message || "Unknown provider error"),
  );
}

async function analyzeImageWithOpenAI({ file, complaintText, category }) {
  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: imageValidationPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `Complaint: ${complaintText}\nCategory: ${category || "not provided"}` },
          { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`, detail: "low" } },
        ],
      },
    ],
  });
  return normalizeImageValidation(parseJson(completion.choices[0].message.content || "{}"));
}

async function analyzeImageWithGemini({ file, complaintText, category }) {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash" });
  const response = await model.generateContent([
    `${imageValidationPrompt}\nComplaint: ${complaintText}\nCategory: ${category || "not provided"}`,
    { inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") } },
  ]);
  return normalizeImageValidation(parseJson(response.response.text()));
}

export async function validateComplaintImages(files = [], { complaintText, category } = {}) {
  if (!files.length) return [];

  const providerConfig = getVisionProviderConfig();
  console.info("[ai] image validation runtime configuration", {
    provider: providerConfig.provider,
    model: providerConfig.model,
    keyConfigured: providerConfig.keyConfigured,
    keyLength: providerConfig.keyLength,
    imageCount: files.length,
  });

  const invalidFile = files.find((file) => !isReadableImage(file));
  if (invalidFile) {
    const result = {
      valid: false,
      relevant: false,
      confidence: 1,
      reason: "The uploaded image is empty, corrupted, or unreadable.",
      detectedIssue: "unreadable image",
      available: true,
    };
    console.info("[ai] image validation decision", result);
    return [result];
  }

  const analyze = env.openaiApiKey
    ? analyzeImageWithOpenAI
    : env.geminiApiKey
      ? analyzeImageWithGemini
      : null;

  if (!analyze) {
    console.error("[ai] image validation unavailable; rejecting complaint with uploaded evidence", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      keyConfigured: providerConfig.keyConfigured,
      reason: "No OPENAI_API_KEY or GEMINI_API_KEY was loaded by backend/config/env.js",
    });
    throw new ApiError(503, "Image validation is temporarily unavailable. Please try again later.", null, "IMAGE_VALIDATION_UNAVAILABLE");
  }

  try {
    console.info("[ai] image validation provider request started", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      imageCount: files.length,
      imageBytes: files.map((file) => file.buffer?.length || 0),
      reachedProvider: false,
    });
    const results = await Promise.all(files.map(async (file) => {
      const result = {
        ...(await analyze({ file, complaintText, category })),
        available: true,
      };
      console.info("[ai] image validation decision", {
        provider: env.openaiApiKey ? "openai" : "gemini",
        valid: result.valid,
        relevant: result.relevant,
        confidence: result.confidence,
        reason: result.reason,
        detectedIssue: result.detectedIssue,
      });
      return result;
    }));
    return results;
  } catch (error) {
    console.error("[ai] image validation failed; rejecting complaint with uploaded evidence", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      httpStatus: error?.status || error?.statusCode || null,
      errorCode: error?.code || null,
      error: sanitizeProviderError(error, [env.openaiApiKey, env.geminiApiKey]),
      reachedProvider: true,
    });
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "Image validation is temporarily unavailable. Please try again later.", null, "IMAGE_VALIDATION_UNAVAILABLE");
  }
}

export async function analyzeComplaintText(text, knownComplaints = []) {
  const normalizeAnalysis = (analysis) => ({
    ...analysis,
    category: inferCategoryFromText(text) || normalizeComplaintCategory(analysis.category),
  });

  if (env.openaiApiKey) {
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    });
    return normalizeAnalysis({
      provider: "openai",
      ...parseJson(completion.choices[0].message.content || "{}"),
    });
  }

  if (env.geminiApiKey) {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-3.8-flash" });
    const response = await model.generateContent(`${prompt}\nComplaint:\n${text}`);
    return normalizeAnalysis({
      provider: "gemini",
      ...parseJson(response.response.text()),
    });
  }

  return normalizeAnalysis(analyzeWithLocalPolicy(text, knownComplaints));
}
