import dotenv from "dotenv";

dotenv.config();

const allowLocalDevStore =
  process.env.ALLOW_LOCAL_DEV_STORE === "true" ||
  (process.env.ALLOW_LOCAL_DEV_STORE !== "false" &&
    (process.env.NODE_ENV || "development") !== "production");

const requiredInProduction = [
  ...(allowLocalDevStore ? [] : ["MONGODB_URI"]),
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "FRONTEND_URL",
];

if (process.env.NODE_ENV === "production") {
  const missing = requiredInProduction.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8787),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicflow",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || "http://localhost:8787",
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowLocalDevStore,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
  accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
  refreshTokenTtl: process.env.JWT_REFRESH_TTL || "7d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  twilioSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioSmsFrom: process.env.TWILIO_SMS_FROM || "",
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "",
  twilioVoiceFrom: process.env.TWILIO_VOICE_FROM || process.env.TWILIO_SMS_FROM || "",
  defaultPhoneCountryCode: process.env.DEFAULT_PHONE_COUNTRY_CODE || "+91",
  communicationWebhookBaseUrl:
    process.env.COMMUNICATION_WEBHOOK_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8787",
  trackingBaseUrl:
    process.env.TRACKING_BASE_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173",
  communicationEnabled: process.env.COMMUNICATION_ENABLED !== "false",
  communicationRetryAttempts: Number(process.env.COMMUNICATION_RETRY_ATTEMPTS || 3),
  communicationRetryDelayMs: Number(process.env.COMMUNICATION_RETRY_DELAY_MS || 30000),
};
