import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { connectDatabase } from "../backend/config/db.js";
import User from "../backend/models/User.js";
import Complaint from "../backend/models/Complaint.js";
import AIAnalysis from "../backend/models/AIAnalysis.js";
import AuditLog from "../backend/models/AuditLog.js";
import ComplaintTimeline from "../backend/models/ComplaintTimeline.js";
import ComplaintStatusLog from "../backend/models/ComplaintStatusLog.js";
import Notification from "../backend/models/Notification.js";
import { getDepartmentForCategory, toWorkflowStatus } from "../backend/constants/workflow.js";
import { maskName, maskPhone } from "../backend/utils/privacy.js";

const sourcePath = resolve("backend", "data", "dev-db.json");

function readSourceDatabase() {
  if (!existsSync(sourcePath)) {
    return { users: [], complaints: [], auditTrail: [], notifications: [] };
  }

  return JSON.parse(readFileSync(sourcePath, "utf-8"));
}

function toPoint(coordinates) {
  if (
    coordinates &&
    Number.isFinite(Number(coordinates.lng)) &&
    Number.isFinite(Number(coordinates.lat))
  ) {
    return {
      type: "Point",
      coordinates: [Number(coordinates.lng), Number(coordinates.lat)],
    };
  }

  return undefined;
}

function parseTicketSequence(ticketId = "") {
  const match = String(ticketId).match(/(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

async function migrateUsers(users) {
  const userIdMap = new Map();

  for (const sourceUser of users) {
    const email = String(sourceUser.email || "").toLowerCase();
    if (!email) continue;

    const payload = {
      name: sourceUser.name || "Citizen",
      email,
      phone: sourceUser.phone,
      password: sourceUser.passwordHash,
      role: sourceUser.role || "citizen",
      preferredLanguage: sourceUser.preferredLanguage || "en",
      refreshTokenHash: sourceUser.refreshTokenHash,
      isActive: sourceUser.isActive !== false,
      lastLoginAt: sourceUser.lastLoginAt ? new Date(sourceUser.lastLoginAt) : undefined,
      createdAt: sourceUser.createdAt ? new Date(sourceUser.createdAt) : undefined,
      updatedAt: sourceUser.updatedAt ? new Date(sourceUser.updatedAt) : undefined,
    };

    const user = await User.findOneAndUpdate(
      { email },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    userIdMap.set(sourceUser._id, user._id);
  }

  return userIdMap;
}

async function migrateComplaints(complaints, userIdMap) {
  const complaintIdMap = new Map();

  for (const sourceComplaint of complaints) {
    const ticketId = sourceComplaint.ticketId;
    if (!ticketId) continue;

    const workflowStatus = sourceComplaint.workflowStatus || toWorkflowStatus(sourceComplaint.status);
    const category = sourceComplaint.category || "Other";
    const createdAt = sourceComplaint.createdAt ? new Date(sourceComplaint.createdAt) : new Date();
    const resolvedAt =
      workflowStatus === "Resolved"
        ? sourceComplaint.updatedAt
          ? new Date(sourceComplaint.updatedAt)
          : new Date()
        : undefined;
    const citizenUserId = userIdMap.get(sourceComplaint.citizen?.id);

    const payload = {
      ticketId,
      ticketSequence: parseTicketSequence(ticketId),
      citizen: citizenUserId,
      citizenSnapshot: {
        name: sourceComplaint.citizen?.name || "Citizen",
        maskedName:
          sourceComplaint.citizen?.maskedName ||
          maskName(sourceComplaint.citizen?.name || "Citizen"),
        phone: sourceComplaint.citizen?.phone || "",
        maskedPhone:
          sourceComplaint.citizen?.maskedPhone ||
          maskPhone(sourceComplaint.citizen?.phone || ""),
        email: sourceComplaint.citizen?.email,
      },
      title: sourceComplaint.title || sourceComplaint.summary,
      originalText: sourceComplaint.description || sourceComplaint.summary || sourceComplaint.title,
      translatedText: sourceComplaint.description || sourceComplaint.summary || sourceComplaint.title,
      summary: sourceComplaint.summary || sourceComplaint.title,
      detectedLanguage: "en",
      languageName: "English",
      category,
      severity: sourceComplaint.urgency || "Medium",
      priority: sourceComplaint.urgency || "Medium",
      status: workflowStatus,
      statusLabel: workflowStatus,
      department: sourceComplaint.assignedDepartment || getDepartmentForCategory(category),
      location: {
        address: sourceComplaint.address,
        sector: sourceComplaint.sector,
        coordinates: toPoint(sourceComplaint.coordinates),
        coordinateSource: sourceComplaint.locationSource,
      },
      moderationStatus: "accepted",
      source: "import",
      resolvedAt,
      sla: {
        dueAt: sourceComplaint.sla?.dueAt ? new Date(sourceComplaint.sla.dueAt) : undefined,
        status: sourceComplaint.sla?.status || "active",
        resolvedAt,
      },
      createdAt,
      updatedAt: sourceComplaint.updatedAt ? new Date(sourceComplaint.updatedAt) : createdAt,
    };

    const complaint = await Complaint.findOneAndUpdate(
      { ticketId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    complaintIdMap.set(ticketId, complaint._id);

    await AIAnalysis.findOneAndUpdate(
      { complaint: complaint._id },
      {
        $set: {
          complaint: complaint._id,
          provider: "local-policy",
          originalText: payload.originalText,
          translatedText: payload.translatedText,
          detectedLanguage: payload.detectedLanguage,
          languageName: payload.languageName,
          interpretation: payload.summary,
          isCivicRelated: true,
          validityStatus: "valid",
          confidenceScore: sourceComplaint.confidence || 0.78,
          severityLevel: payload.severity,
          priority: payload.priority,
          category,
          rawResponse: { source: "local-dev-migration" },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  return complaintIdMap;
}

async function migrateAuditTrail(entries, complaintIdMap, userIdMap) {
  for (const entry of entries) {
    const complaintId = complaintIdMap.get(entry.ticketId);
    if (!complaintId || !entry.id) continue;

    const actor = userIdMap.get(entry.actorId);
    const basePayload = {
      complaint: complaintId,
      ticketId: entry.ticketId,
      actor,
      actorId: actor?.toString() || entry.actorId || "system",
      actorName: entry.actorName || "System",
      actorRole: entry.role || "system",
      action: entry.action || "Migrated event",
      eventType: entry.eventType || "system",
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      metadata: entry.metadata,
      createdAt: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      updatedAt: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    };

    await AuditLog.findOneAndUpdate(
      { ticketId: entry.ticketId, action: basePayload.action, createdAt: basePayload.createdAt },
      { $set: basePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await ComplaintTimeline.findOneAndUpdate(
      { ticketId: entry.ticketId, action: basePayload.action, createdAt: basePayload.createdAt },
      { $set: basePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (entry.toStatus) {
      await ComplaintStatusLog.findOneAndUpdate(
        { ticketId: entry.ticketId, toStatus: entry.toStatus, createdAt: basePayload.createdAt },
        {
          $set: {
            complaint: complaintId,
            ticketId: entry.ticketId,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            changedBy: actor,
            changedByName: basePayload.actorName,
            reason: entry.note,
            createdAt: basePayload.createdAt,
            updatedAt: basePayload.updatedAt,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }
}

async function migrateNotifications(notifications, complaintIdMap, userIdMap) {
  for (const notification of notifications) {
    const complaint = complaintIdMap.get(notification.ticketId);
    await Notification.findOneAndUpdate(
      { dedupeKey: notification.dedupeKey || notification.id },
      {
        $set: {
          complaint,
          ticketId: notification.ticketId,
          recipientUser: userIdMap.get(notification.recipientUser),
          recipientPhone: notification.recipientPhone,
          channel: notification.channel || "in_app",
          language: notification.language || "en",
          template: notification.template,
          message: notification.message || "Migrated notification",
          eventType: notification.eventType || "complaint_registered",
          status: notification.status || "queued",
          dedupeKey: notification.dedupeKey || notification.id,
          createdAt: notification.createdAt ? new Date(notification.createdAt) : undefined,
          updatedAt: notification.updatedAt ? new Date(notification.updatedAt) : undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function main() {
  const source = readSourceDatabase();
  await connectDatabase();

  const userIdMap = await migrateUsers(source.users || []);
  const complaintIdMap = await migrateComplaints(source.complaints || [], userIdMap);
  await migrateAuditTrail(source.auditTrail || [], complaintIdMap, userIdMap);
  await migrateNotifications(source.notifications || [], complaintIdMap, userIdMap);

  const counts = {
    users: await User.countDocuments(),
    complaints: await Complaint.countDocuments(),
    auditLogs: await AuditLog.countDocuments(),
    timelineEvents: await ComplaintTimeline.countDocuments(),
    notifications: await Notification.countDocuments(),
  };

  console.log(`Migrated local development data to MongoDB: ${JSON.stringify(counts)}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
