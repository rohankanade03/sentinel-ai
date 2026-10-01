import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss";
import { env } from "../config/env.js";

function isAllowedDevelopmentOrigin(origin) {
  if (env.nodeEnv === "production") return false;

  try {
    const { hostname, port, protocol } = new URL(origin);
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    return protocol === "http:" && isLocalHost && ["5173", "4173"].includes(port);
  } catch {
    return false;
  }
}

function isAllowedVercelProjectOrigin(origin) {
  if (env.nodeEnv !== "production") return false;

  try {
    const { hostname, protocol } = new URL(origin);

    if (protocol !== "https:" || !hostname.endsWith(".vercel.app")) {
      return false;
    }

    return (
      hostname === "sentinal-ai-tau.vercel.app" ||
      hostname === "civicflow-tau.vercel.app" ||
      hostname.startsWith("sentinal-ai-rohankanade610-7278") ||
      hostname.startsWith("sentinal-ai-") && hostname.endsWith("-rohankanade610-7278s-projects.vercel.app")
    );
  } catch {
    return false;
  }
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (
      !origin ||
      env.corsOrigins.includes(origin) ||
      isAllowedDevelopmentOrigin(origin) ||
      isAllowedVercelProjectOrigin(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
});

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export function sanitizeBody(request, _response, next) {
  const sanitizeValue = (value) => {
    if (typeof value === "string") return xss(value.trim());
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)]));
    }
    return value;
  };

  request.body = sanitizeValue(request.body || {});
  next();
}

export const mongoSanitizeMiddleware = mongoSanitize();
export const hppMiddleware = hpp();
