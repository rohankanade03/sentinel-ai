import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/apiResponse.js";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import {
  clearAuthCookies,
  hashToken,
  randomToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
} from "../services/tokenService.js";
import {
  forgotPasswordLocal,
  loginLocal,
  logoutLocal,
  refreshLocal,
  resetPasswordLocal,
  signupLocal,
} from "../services/localDevStore.js";

const ADMIN_INVITE_CODE = "admin@access";

function isLocalDatabaseMode(request) {
  return request.app.get("databaseMode") === "local-json";
}

function assertAdminInviteCode(body) {
  if (body.role !== "admin") return;

  if (body.adminInviteCode !== ADMIN_INVITE_CODE) {
    throw new ApiError(403, "Invalid Admin Invite Code.");
  }
}

function assertWorkerId(body) {
  if (body.role !== "worker") return;

  if (!/^worker@\d+$/.test(String(body.workerId || "").toLowerCase())) {
    throw new ApiError(422, "Worker ID must use the worker@123 format.");
  }
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    workerId: user.workerId,
  };
}

async function issueSession(response, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  setAuthCookies(response, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

export const signup = asyncHandler(async (request, response) => {
  assertAdminInviteCode(request.body);
  assertWorkerId(request.body);

  if (isLocalDatabaseMode(request)) {
    sendCreated(response, await signupLocal(request, response), "Signup successful");
    return;
  }

  const exists = await userRepository.findByEmail(request.body.email);
  if (exists) throw new ApiError(409, "Email already registered");
  if (request.body.role === "worker") {
    const existingWorker = await User.findOne({
      workerId: String(request.body.workerId).toLowerCase(),
    }).lean();
    if (existingWorker) throw new ApiError(409, "Worker ID is already registered");
  }
  const { adminInviteCode: _adminInviteCode, ...userPayload } = request.body;
  const user = await userRepository.create(userPayload);
  const tokens = await issueSession(response, user);
  sendCreated(response, { user: publicUser(user), ...tokens }, "Signup successful");
});

export const login = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, await loginLocal(request, response), "Login successful");
    return;
  }

  const user = await userRepository.findByEmailWithSecrets(request.body.email);
  if (!user || !(await user.comparePassword(request.body.password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  user.lastLoginAt = new Date();
  const tokens = await issueSession(response, user);
  sendSuccess(response, { user: publicUser(user), ...tokens }, "Login successful");
});

export const logout = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    logoutLocal(request, response);
    sendSuccess(response, null, "Logged out");
    return;
  }

  if (request.user) {
    request.user.refreshTokenHash = undefined;
    await request.user.save();
  }
  clearAuthCookies(response);
  sendSuccess(response, null, "Logged out");
});

export const refresh = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    sendSuccess(response, await refreshLocal(request, response), "Session refreshed");
    return;
  }

  const token = request.cookies?.refreshToken || request.body.refreshToken;
  if (!token) throw new ApiError(401, "Refresh token required");
  const payload = jwt.verify(token, env.jwtRefreshSecret);
  const user = await userRepository.findByIdWithRefreshToken(payload.sub);
  if (!user || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) {
    throw new ApiError(401, "Invalid refresh token");
  }
  const tokens = await issueSession(response, user);
  sendSuccess(response, { user: publicUser(user), ...tokens }, "Session refreshed");
});

export const forgotPassword = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    const token = await forgotPasswordLocal(request);
    sendSuccess(
      response,
      token ? { resetToken: token } : null,
      token
        ? "Password reset token generated"
        : "If the account exists, a reset token was generated",
    );
    return;
  }

  const user = await User.findOne({ email: request.body.email }).select("+resetPasswordTokenHash");
  if (user) {
    const token = randomToken();
    user.resetPasswordTokenHash = await hashToken(token);
    user.resetPasswordExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
    await user.save();
    // In production this token is sent by email/SMS provider.
    return sendSuccess(response, { resetToken: token }, "Password reset token generated");
  }
  return sendSuccess(response, null, "If the account exists, a reset token was generated");
});

export const resetPassword = asyncHandler(async (request, response) => {
  if (isLocalDatabaseMode(request)) {
    await resetPasswordLocal(request);
    sendSuccess(response, null, "Password reset successful");
    return;
  }

  const users = await userRepository.findActiveResetCandidates();
  let user = null;
  for (const candidate of users) {
    if (await bcrypt.compare(request.body.token, candidate.resetPasswordTokenHash)) {
      user = candidate;
      break;
    }
  }
  if (!user) throw new ApiError(400, "Invalid or expired reset token");
  user.password = request.body.password;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();
  sendSuccess(response, null, "Password reset successful");
});

export const me = asyncHandler(async (request, response) => {
  sendSuccess(response, publicUser(request.user));
});
