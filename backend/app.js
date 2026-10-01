import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import {
  apiLimiter,
  corsMiddleware,
  helmetMiddleware,
  hppMiddleware,
  mongoSanitizeMiddleware,
  sanitizeBody,
} from "./middleware/securityMiddleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import communicationRoutes from "./routes/communicationRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(mongoSanitizeMiddleware);
  app.use(hppMiddleware);
  app.use(sanitizeBody);
  app.use(apiLimiter);
  app.use(morgan("dev"));

  app.get("/api/health", (_request, response) => {
    const databaseMode = app.get("databaseMode") || "starting";

    response.json({
      ok: ["mongodb", "local-json"].includes(databaseMode),
      service: "civicflow-backend",
      database: databaseMode,
    });
  });

  app.use("/api", (request, response, next) => {
    if (
      request.path === "/health" ||
      ["mongodb", "local-json"].includes(app.get("databaseMode"))
    ) {
      return next();
    }

    return response.status(503).json({
      success: false,
      code: "DATABASE_UNAVAILABLE",
      message:
        "CivicFlow API is running, but MongoDB is not connected. Configure MONGODB_URI or start MongoDB, then retry.",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api", complaintRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/communications", communicationRoutes);
  app.use("/api/track", trackingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
