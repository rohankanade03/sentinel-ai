import { fetchJson } from "./backendClient";

export type UserRole = "citizen" | "admin" | "officer" | "worker";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  preferredLanguage?: string;
  workerId?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  name: string;
  phone?: string;
  role: UserRole;
  preferredLanguage?: string;
  adminInviteCode?: string;
  workerId?: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return fetchJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    credentials: "include",
  });
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  return fetchJson<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
    credentials: "include",
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>("/api/auth/me", {
    credentials: "include",
  });
}

export async function logout(): Promise<void> {
  await fetchJson<null>("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}
