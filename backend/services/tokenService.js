import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl,
  });
}

export async function hashToken(token) {
  return bcrypt.hash(token, 12);
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function setAuthCookies(response, accessToken, refreshToken) {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
  };

  response.cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  response.cookie("refreshToken", refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(response) {
  response.clearCookie("accessToken");
  response.clearCookie("refreshToken");
}
