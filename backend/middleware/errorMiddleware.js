import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validateRequest(request, _response, next) {
  const result = validationResult(request);

  if (!result.isEmpty()) {
    const details = result.array();
    const firstMessage = details[0]?.msg || "Validation failed";
    return next(new ApiError(422, firstMessage, details));
  }

  return next();
}

export function notFoundHandler(request, _response, next) {
  next(new ApiError(404, `Route not found: ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");

  response.status(statusCode).json({
    success: false,
    code,
    message: error.message || "Internal server error",
    details: error.details || undefined,
    timestamp: new Date().toISOString(),
  });
}
