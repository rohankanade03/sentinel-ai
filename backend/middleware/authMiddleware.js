import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { userRepository } from "../repositories/userRepository.js";
import { getLocalUserById } from "../services/localDevStore.js";

export async function authenticate(request, _response, next) {
  try {
    const header = request.headers.authorization;
    const token = request.cookies?.accessToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

    if (!token) throw new ApiError(401, "Authentication required");

    const payload = jwt.verify(token, env.jwtAccessSecret);
    if (request.app.get("databaseMode") === "local-json") {
      const user = getLocalUserById(payload.sub);
      if (!user) throw new ApiError(401, "Invalid session");
      request.user = user;
      return next();
    }

    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive) throw new ApiError(401, "Invalid session");

    request.user = user;
    return next();
  } catch (error) {
    return next(error.statusCode ? error : new ApiError(401, "Invalid or expired token"));
  }
}

export async function optionalAuthenticate(request, _response, next) {
  try {
    const header = request.headers.authorization;
    const token = request.cookies?.accessToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

    if (!token) return next();

    const payload = jwt.verify(token, env.jwtAccessSecret);
    if (request.app.get("databaseMode") === "local-json") {
      const user = getLocalUserById(payload.sub);
      if (user) request.user = user;
      return next();
    }

    const user = await userRepository.findById(payload.sub);
    if (user?.isActive) request.user = user;
    return next();
  } catch {
    return next();
  }
}

export function authorize(...roles) {
  return (request, _response, next) => {
    if (!request.user) return next(new ApiError(401, "Authentication required"));
    if (!roles.includes(request.user.role)) return next(new ApiError(403, "Insufficient permissions"));
    return next();
  };
}
