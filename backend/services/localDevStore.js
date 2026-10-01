import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  DEPARTMENT_BY_CATEGORY,
  PUBLIC_STATUSES,
  getDepartmentForCategory,
  getSlaDueAt,
  inferCategoryFromText,
  normalizeComplaintCategory,
  slugCategory,
  toPublicStatus,
  toWorkflowStatus,
} from "../constants/workflow.js";
import { analyzeWithLocalPolicy } from "../ai/localPolicyEngine.js";
import { env } from "../config/env.js";
import { maskCitizen, maskName, maskPhone } from "../utils/privacy.js";
import { clearAuthCookies, setAuthCookies } from "./tokenService.js";
import { resolveComplaintLocation } from "./geocodingService.js";
import { sendEphemeralCitizenConfirmation } from "./communicationService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databasePath =
  process.env.VERCEL === "1"
    ? "/tmp/civicflow-dev-db.json"
    : resolve(__dirname, "..", "data", "dev-db.json");

function emptyDatabase() {
  return {
    generatedAt: new Date().toISOString(),
    users: [],
    complaints: [],
    auditTrail: [],
    notifications: [],
  };
}

function loadDatabase() {
  if (!existsSync(databasePath)) {
    saveDatabase(emptyDatabase());
  }

  return JSON.parse(readFileSync(databasePath, "utf-8"));
}

function saveDatabase(database) {
  mkdirSync(dirname(databasePath), { recursive: true });
  writeFileSync(databasePath, JSON.stringify(database, null, 2));
}

function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    workerId: user.workerId,
  };
}

function signLocalAccessToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

function signLocalRefreshToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl,
  });
}

async function issueLocalSession(response, user, database) {
  const accessToken = signLocalAccessToken(user);
  const refreshToken = signLocalRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  database.generatedAt = new Date().toISOString();
  saveDatabase(database);
  setAuthCookies(response, accessToken, refreshToken);
  return { user: publicUser(user), accessToken, refreshToken };
}

function createAuditEntry({
  ticketId,
  complaint,
  actor,
  action,
  eventType = "system",
  fromStatus,
  toStatus,
  note,
  metadata,
}) {
  return {
    id: `${ticketId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ticketId,
    actorId: actor?._id || "system",
    actorName: actor?.name || "System",
    role: actor?.role || "system",
    action,
    eventType,
    fromStatus,
    toStatus,
    note,
    metadata,
    timestamp: new Date().toISOString(),
    complaintTitle: complaint?.title,
    category: complaint?.category,
    sector: complaint?.sector,
    currentStatus: complaint?.status,
    assignedDepartment: complaint?.assignedDepartment,
  };
}

function nextTicketId(complaints) {
  const year = new Date().getFullYear();
  const prefix = `CF-${year}-`;
  const max = complaints.reduce((currentMax, complaint) => {
    if (!String(complaint.ticketId).startsWith(prefix)) return currentMax;
    const value = Number(String(complaint.ticketId).slice(prefix.length));
    return Number.isFinite(value) ? Math.max(currentMax, value) : currentMax;
  }, 0);

  return `${prefix}${String(max + 1).padStart(6, "0")}`;
}

function reportedAt(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalPublicComplaint(complaint) {
  return {
    id: complaint.id,
    ticketId: complaint.ticketId,
    title: complaint.title,
    summary: complaint.summary,
    description: complaint.description,
    location: complaint.address || complaint.sector || "Unmapped sector",
    address: complaint.address || "",
    sector: complaint.sector || "Unmapped sector",
    category: complaint.category,
    status: complaint.status,
    workflowStatus: complaint.workflowStatus,
    urgency: complaint.urgency,
    reportedAt: complaint.reportedAt,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    citizen: maskCitizen(complaint.citizen),
    aiClassificationLabel: complaint.aiSummary,
    aiSummary: complaint.aiSummary,
    confidence: complaint.confidence,
    assignedDepartment: complaint.assignedDepartment,
    coordinates: complaint.coordinates,
    locationSource: complaint.locationSource,
    media: complaint.media || [],
    communication: complaint.communication,
    resolutionConfirmedAt: complaint.resolutionConfirmedAt,
    citizenRating: complaint.citizenRating,
    citizenActions: complaint.citizenActions || [],
    metadata: complaint.metadata || [],
  };
}

function toLocalDashboardComplaint(complaint) {
  const safe = toLocalPublicComplaint(complaint);

  return {
    ...safe,
    audit: {
      latestAction: complaint.latestAction || "Complaint updated",
      actor: complaint.latestActor || safe.assignedDepartment,
      timestamp: new Date(safe.updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    cardTone: safe.urgency === "Critical" ? "alert" : "civic",
    visualSize: safe.urgency === "Critical" ? "tall" : "standard",
  };
}

function findComplaint(database, ticketId) {
  return database.complaints.find(
    (complaint) =>
      String(complaint.ticketId).toLowerCase() === String(ticketId).toLowerCase() ||
      String(complaint.id).toLowerCase() === String(ticketId).toLowerCase(),
  );
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function isLocalComplaintOwnedByUser(complaint, user) {
  if (!complaint || !user) return false;
  if (complaint.citizen?.id && (complaint.citizen.id === user.id || complaint.citizen.id === user._id)) {
    return true;
  }
  if (complaint.citizen?.email && user.email) {
    return String(complaint.citizen.email).toLowerCase() === String(user.email).toLowerCase();
  }

  const complaintPhone = digitsOnly(complaint.citizen?.phone);
  const userPhone = digitsOnly(user.phone);
  return Boolean(complaintPhone && userPhone && complaintPhone.endsWith(userPhone.slice(-10)));
}

export function isLocalDatabaseMode(request) {
  return request.app.get("databaseMode") === "local-json";
}

export function getLocalUserById(id) {
  const user = loadDatabase().users.find((item) => item._id === id);
  return user ? publicUser(user) : null;
}

export async function signupLocal(request, response) {
  const database = loadDatabase();
  const email = String(request.body.email).toLowerCase();

  if (database.users.some((user) => user.email === email)) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }
  if (request.body.role === "worker") {
    const workerId = String(request.body.workerId || "").toLowerCase();
    if (!/^worker@\d+$/.test(workerId)) {
      const error = new Error("Worker ID must use the worker@123 format.");
      error.statusCode = 422;
      throw error;
    }
    if (database.users.some((user) => user.workerId === workerId)) {
      const error = new Error("Worker ID is already registered");
      error.statusCode = 409;
      throw error;
    }
  }

  const user = {
    _id: `local-user-${Date.now()}`,
    name: request.body.name,
    email,
    phone: request.body.phone || "",
    passwordHash: await bcrypt.hash(request.body.password, 12),
    role: request.body.role || "citizen",
    preferredLanguage: request.body.preferredLanguage || "en",
    workerId: request.body.role === "worker" ? String(request.body.workerId).toLowerCase() : undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  database.users.push(user);
  return issueLocalSession(response, user, database);
}

export async function loginLocal(request, response) {
  const database = loadDatabase();
  const email = String(request.body.email).toLowerCase();
  const user = database.users.find((item) => item.email === email);

  if (!user || !(await bcrypt.compare(request.body.password, user.passwordHash))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = user.lastLoginAt;
  return issueLocalSession(response, user, database);
}

export function logoutLocal(_request, response) {
  clearAuthCookies(response);
}

export async function refreshLocal(request, response) {
  const token = request.cookies?.refreshToken || request.body.refreshToken;
  if (!token) {
    const error = new Error("Refresh token required");
    error.statusCode = 401;
    throw error;
  }

  const payload = jwt.verify(token, env.jwtRefreshSecret);
  const database = loadDatabase();
  const user = database.users.find((item) => item._id === payload.sub);

  if (!user || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  return issueLocalSession(response, user, database);
}

export async function forgotPasswordLocal(request) {
  const database = loadDatabase();
  const user = database.users.find(
    (item) => item.email === String(request.body.email).toLowerCase(),
  );

  if (!user) return null;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  user.resetPasswordTokenHash = await bcrypt.hash(token, 12);
  user.resetPasswordExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  saveDatabase(database);
  return token;
}

export async function resetPasswordLocal(request) {
  const database = loadDatabase();
  const candidates = database.users.filter(
    (user) => user.resetPasswordExpiresAt && new Date(user.resetPasswordExpiresAt) > new Date(),
  );

  for (const user of candidates) {
    if (await bcrypt.compare(request.body.token, user.resetPasswordTokenHash)) {
      user.passwordHash = await bcrypt.hash(request.body.password, 12);
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpiresAt = undefined;
      user.updatedAt = new Date().toISOString();
      saveDatabase(database);
      return;
    }
  }

  const error = new Error("Invalid or expired reset token");
  error.statusCode = 400;
  throw error;
}

export async function createLocalComplaint(payload, _files = [], user = null) {
  const complaintText = payload.complaint || payload.description || payload.summary;
  if (!complaintText) {
    const error = new Error("Complaint text is required.");
    error.statusCode = 422;
    throw error;
  }

  const category = normalizeComplaintCategory(
    inferCategoryFromText(
      payload.title,
      payload.complaint,
      payload.description,
      payload.summary,
      complaintText,
    ) || payload.category,
  );
  const database = loadDatabase();
  const ai = analyzeWithLocalPolicy(
    [payload.title, complaintText].filter(Boolean).join(" "),
    database.complaints,
  );
  const resolvedLocation = await resolveComplaintLocation(payload);
  const ticketId = nextTicketId(database.complaints);
  const now = new Date();
  const normalizedCategory = normalizeComplaintCategory(category || ai.category);
  ai.category = normalizedCategory;
  const workflowStatus = ai.validityStatus === "needs_review" ? "Under Review" : "Pending";
  const publicStatus = toPublicStatus(workflowStatus);
  const citizen = {
    id: user?._id || user?.id,
    name: payload.citizenName || payload.name || user?.name || "Citizen",
    phone: payload.citizenPhone || payload.phone || user?.phone || "",
    email: payload.email || user?.email,
  };
  const complaint = {
    id: ticketId.toLowerCase(),
    ticketId,
    title: String(payload.title || complaintText).slice(0, 90),
    description: complaintText,
    summary: ai.interpretation || complaintText,
    sector: resolvedLocation.sector,
    address: resolvedLocation.address,
    coordinates: resolvedLocation.coordinates,
    locationSource: resolvedLocation.coordinateSource,
    category: normalizedCategory,
    status: publicStatus,
    workflowStatus,
    urgency: ai.priority || "Medium",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    reportedAt: reportedAt(now),
    citizen: {
      ...citizen,
      maskedName: maskName(citizen.name),
      maskedPhone: maskPhone(citizen.phone),
    },
    assignedDepartment: getDepartmentForCategory(normalizedCategory),
    aiSummary: ai.interpretation,
    confidence: ai.confidenceScore || 0.78,
    sla: {
      dueAt: getSlaDueAt(ai.priority || "Medium", now).toISOString(),
      status: "active",
    },
    metadata: [
      { label: "Source", value: "Local development persistence" },
      { label: "Sector", value: resolvedLocation.sector },
      { label: "Language", value: ai.languageName || "English" },
    ],
    media: [],
  };

  database.complaints.unshift(complaint);
  database.auditTrail.push(
    createAuditEntry({
      ticketId,
      complaint,
      actor: user,
      action: "Complaint registered",
      eventType: "intake",
      toStatus: workflowStatus,
      note: "Complaint accepted and ticket generated.",
    }),
  );
  database.generatedAt = now.toISOString();
  saveDatabase(database);
  complaint.communication = await sendEphemeralCitizenConfirmation(complaint);

  return toLocalPublicComplaint(complaint);
}

export function getLocalTicket(ticketId) {
  const complaint = findComplaint(loadDatabase(), ticketId);
  return complaint ? toLocalPublicComplaint(complaint) : null;
}

export function getLocalComplaints() {
  return loadDatabase().complaints.map(toLocalPublicComplaint);
}

export function getLocalCitizenComplaints(user) {
  return loadDatabase()
    .complaints
    .filter((complaint) => isLocalComplaintOwnedByUser(complaint, user))
    .map(toLocalPublicComplaint);
}

export function getLocalDashboardSnapshot() {
  const database = loadDatabase();
  const complaints = database.complaints.map(toLocalDashboardComplaint);
  const categoryNames = Array.from(
    new Set([
      ...Object.keys(DEPARTMENT_BY_CATEGORY),
      ...complaints.map((complaint) => complaint.category),
    ]),
  ).sort();

  return {
    generatedAt: new Date().toISOString(),
    stats: [
      {
        id: "total-complaints",
        label: "Total complaints",
        value: String(complaints.length),
        delta: "Local development database",
        tone: "teal",
      },
      {
        id: "open-complaints",
        label: "Open complaints",
        value: String(complaints.filter((item) => item.status !== "Resolved").length),
        delta: "Received or active",
        tone: "amber",
      },
      {
        id: "critical-flags",
        label: "Critical flags",
        value: String(complaints.filter((item) => item.urgency === "Critical").length),
        delta: "Emergency queue",
        tone: "rose",
      },
      {
        id: "privacy-masked",
        label: "Privacy masked",
        value: "100%",
        delta: "Citizen names and phones protected",
        tone: "emerald",
      },
    ],
    statuses: PUBLIC_STATUSES.map((status) => ({
      id: status,
      label: status,
      count: complaints.filter((complaint) => complaint.status === status).length,
      description: `${status} complaints`,
      tone:
        status === "Resolved"
          ? "emerald"
          : status === "In Progress"
            ? "amber"
            : status === "Assigned"
              ? "blue"
              : "rose",
    })),
    complaints,
    categories: [
      { label: "All categories", value: "all" },
      ...categoryNames.map((category) => ({ label: category, value: slugCategory(category) })),
    ],
    statusFilters: [
      { label: "All status", value: "all" },
      ...PUBLIC_STATUSES.map((status) => ({ label: status, value: status })),
    ],
  };
}

export async function updateLocalComplaint(ticketId, payload, actor = null) {
  const database = loadDatabase();
  const complaint = findComplaint(database, ticketId);
  if (!complaint) return null;

  const fromWorkflowStatus = complaint.workflowStatus || toWorkflowStatus(complaint.status);

  if (payload.status) {
    complaint.workflowStatus = toWorkflowStatus(payload.status);
    complaint.status = toPublicStatus(complaint.workflowStatus);
  }

  if (payload.complaint || payload.description || payload.summary) {
    complaint.description = payload.complaint || payload.description || complaint.description;
    complaint.summary = payload.summary || payload.description || payload.complaint || complaint.summary;
    complaint.title = String(payload.title || complaint.summary).slice(0, 90);
  }

  if (payload.category) {
    complaint.category = normalizeComplaintCategory(payload.category);
    complaint.assignedDepartment = payload.assignedDepartment || getDepartmentForCategory(complaint.category);
  }

  if (payload.location || payload.sector || payload.address || payload.latitude || payload.lat) {
    const resolvedLocation = await resolveComplaintLocation(payload);
    complaint.sector = resolvedLocation.sector;
    complaint.address = resolvedLocation.address;
    complaint.coordinates = resolvedLocation.coordinates || complaint.coordinates;
    complaint.locationSource = resolvedLocation.coordinateSource || complaint.locationSource;
  }

  complaint.updatedAt = new Date().toISOString();
  complaint.latestAction = payload.action || "Updated complaint";
  complaint.latestActor = actor?.name || "System";
  database.auditTrail.push(
    createAuditEntry({
      ticketId: complaint.ticketId,
      complaint,
      actor,
      action: complaint.latestAction,
      eventType: payload.status ? "status_change" : "system",
      fromStatus: fromWorkflowStatus,
      toStatus: complaint.workflowStatus,
      note: payload.note,
    }),
  );
  database.generatedAt = complaint.updatedAt;
  saveDatabase(database);

  return toLocalPublicComplaint(complaint);
}

export function getLocalTicketTimeline(ticketId) {
  return loadDatabase()
    .auditTrail.filter(
      (entry) => String(entry.ticketId).toLowerCase() === String(ticketId).toLowerCase(),
    )
    .sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp));
}

export function getLocalCitizenProgress(ticketId) {
  const database = loadDatabase();
  const complaint = findComplaint(database, ticketId);
  if (!complaint) return null;

  return {
    ticketId: complaint.ticketId,
    title: complaint.title,
    summary: complaint.summary,
    category: complaint.category,
    sector: complaint.sector,
    status: complaint.status,
    citizen: maskCitizen(complaint.citizen),
    assignedDepartment: complaint.assignedDepartment,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    tracker: [
      { id: "Received", label: "Received", completed: true },
      {
        id: "Assigned",
        label: "Assigned",
        completed: ["Assigned", "In Progress", "Resolved"].includes(complaint.status),
      },
      {
        id: "In Progress",
        label: "In Progress",
        completed: ["In Progress", "Resolved"].includes(complaint.status),
      },
      { id: "Fixed", label: "Fixed", completed: complaint.status === "Resolved" },
    ],
    auditTrail: getLocalTicketTimeline(ticketId),
  };
}

export function getLocalCitizenTracking(ticketId, user) {
  const database = loadDatabase();
  const complaint = findComplaint(database, ticketId);
  if (!complaint || !isLocalComplaintOwnedByUser(complaint, user)) return null;

  return {
    ...getLocalCitizenProgress(ticketId),
    location: complaint.address || complaint.sector,
    assignedOfficer: complaint.assignedOfficer,
    communications: complaint.communication?.history || [],
    media: complaint.media || [],
    citizenActions: complaint.citizenActions || [],
    resolutionConfirmedAt: complaint.resolutionConfirmedAt,
    citizenRating: complaint.citizenRating,
  };
}

export async function addLocalCitizenComplaintAction(ticketId, payload, user) {
  const database = loadDatabase();
  const complaint = findComplaint(database, ticketId);
  if (!complaint || !isLocalComplaintOwnedByUser(complaint, user)) return null;

  const fromStatus = complaint.workflowStatus || toWorkflowStatus(complaint.status);
  let toStatus = fromStatus;
  let actionLabel = "Citizen comment added";

  if (payload.action === "reopen") {
    if (complaint.status !== "Resolved") {
      const error = new Error("Only resolved complaints can be reopened.");
      error.statusCode = 409;
      throw error;
    }
    complaint.workflowStatus = "In Progress";
    complaint.status = "In Progress";
    complaint.resolutionConfirmedAt = undefined;
    toStatus = "In Progress";
    actionLabel = "Citizen reopened complaint";
  }

  if (payload.action === "confirm_resolution") {
    if (complaint.status !== "Resolved") {
      const error = new Error("Only resolved complaints can be confirmed.");
      error.statusCode = 409;
      throw error;
    }
    complaint.resolutionConfirmedAt = new Date().toISOString();
    actionLabel = "Citizen confirmed resolution";
  }

  if (payload.action === "rate") {
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const error = new Error("Rating must be between 1 and 5.");
      error.statusCode = 422;
      throw error;
    }
    complaint.citizenRating = rating;
    actionLabel = "Citizen rated complaint handling";
  }

  complaint.citizenActions = complaint.citizenActions || [];
  complaint.citizenActions.push({
    actorId: user?._id || user?.id,
    actorName: user?.name || "Citizen",
    action: payload.action,
    note: payload.note,
    rating: payload.action === "rate" ? Number(payload.rating) : undefined,
    createdAt: new Date().toISOString(),
  });
  complaint.updatedAt = new Date().toISOString();
  complaint.latestAction = actionLabel;
  complaint.latestActor = user?.name || "Citizen";

  database.auditTrail.push(
    createAuditEntry({
      ticketId: complaint.ticketId,
      complaint,
      actor: user,
      action: actionLabel,
      eventType: payload.action === "reopen" ? "status_change" : "comment",
      fromStatus,
      toStatus,
      note: payload.note,
      metadata: {
        citizenAction: payload.action,
        rating: payload.action === "rate" ? String(payload.rating) : undefined,
      },
    }),
  );
  database.generatedAt = complaint.updatedAt;
  saveDatabase(database);

  return toLocalPublicComplaint(complaint);
}

export function getLocalAuditLog() {
  return loadDatabase().auditTrail.sort(
    (first, second) => new Date(second.timestamp) - new Date(first.timestamp),
  );
}

export function getLocalAnalytics() {
  const complaints = loadDatabase().complaints;
  const countBy = (selector) =>
    Object.entries(
      complaints.reduce((groups, complaint) => {
        const key = selector(complaint) || "Unknown";
        groups[key] = (groups[key] || 0) + 1;
        return groups;
      }, {}),
    ).map(([_id, count]) => ({ _id, count }));

  return {
    byStatus: countBy((complaint) => complaint.workflowStatus || complaint.status),
    byCategory: countBy((complaint) => complaint.category),
    byWard: countBy((complaint) => complaint.ward || complaint.sector),
    monthly: countBy((complaint) => complaint.createdAt?.slice(0, 7)),
    bySlaStatus: countBy((complaint) => complaint.sla?.status),
    generatedAt: new Date().toISOString(),
  };
}
