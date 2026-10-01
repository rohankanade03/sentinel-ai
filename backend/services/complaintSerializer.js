import { maskCitizen } from "../utils/privacy.js";
import { buildTrackingLink } from "./communicationMessageService.js";

const statusMap = {
  Pending: "Received",
  "Under Review": "Received",
  Assigned: "Assigned",
  "In Progress": "In Progress",
  Resolved: "Resolved",
  Rejected: "Resolved",
};

function reportedAt(date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLatLng(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return undefined;
  }

  const [lng, lat] = coordinates;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return { lat, lng };
}

function toPublicMedia(media = []) {
  return media.map((item) => ({
    id: item._id?.toString?.() || item.id || item.publicId,
    url: item.secureUrl || item.url,
    publicId: item.publicId,
    width: item.width,
    height: item.height,
    format: item.format,
  }));
}

export function toPublicComplaint(complaint) {
  const plain = complaint.toObject ? complaint.toObject() : complaint;
  const coordinates = toLatLng(plain.location?.coordinates?.coordinates);
  return {
    id: plain._id?.toString?.() || plain.id,
    ticketId: plain.ticketId,
    title: plain.title,
    summary: plain.summary,
    description: plain.originalText,
    location: plain.location?.address || plain.location?.sector || "Unmapped sector",
    address: plain.location?.address || "",
    sector: plain.location?.sector || "Unmapped sector",
    category: plain.category,
    status: statusMap[plain.status] || plain.status,
    workflowStatus: plain.status,
    urgency: plain.priority === "Critical" ? "Critical" : plain.priority || plain.severity,
    reportedAt: reportedAt(plain.createdAt),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    citizen: maskCitizen(plain.citizenSnapshot),
    aiClassificationLabel: plain.summary,
    aiSummary: plain.summary,
    confidence: 0.86,
    assignedDepartment: plain.department,
    assignedWorker: plain.assignedWorkerSnapshot,
    coordinates,
    locationSource: plain.location?.coordinateSource,
    geocodingProvider: plain.location?.geocodingProvider,
    media: toPublicMedia(plain.media),
    trackingUrl: buildTrackingLink(plain.ticketId),
    communication: plain.communicationSummary,
    resolutionConfirmedAt: plain.resolutionConfirmedAt,
    citizenRating: plain.citizenRating,
    citizenActions: plain.citizenActions || [],
    metadata: [
      { label: "Source", value: plain.source || "web" },
      { label: "Sector", value: plain.location?.sector || "Unmapped" },
      { label: "Language", value: plain.languageName || plain.detectedLanguage },
      ...(coordinates
        ? [
            {
              label: "Coordinates",
              value: `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
            },
          ]
        : []),
    ],
  };
}

export function toDashboardComplaint(complaint) {
  const safe = toPublicComplaint(complaint);
  return {
    id: safe.id,
    ticketId: safe.ticketId,
    title: safe.title,
    summary: safe.summary,
    location: safe.location,
    address: safe.address,
    sector: safe.sector,
    category: safe.category,
    status: safe.status,
    urgency: safe.urgency,
    reportedAt: safe.reportedAt,
    citizen: safe.citizen,
    aiClassificationLabel: safe.aiSummary,
    confidence: safe.confidence,
    audit: {
      latestAction: `${safe.workflowStatus} via backend`,
      actor: safe.assignedDepartment,
      timestamp: new Date(safe.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    metadata: safe.metadata,
    coordinates: safe.coordinates,
    locationSource: safe.locationSource,
    media: safe.media,
    trackingUrl: safe.trackingUrl,
    communication: safe.communication,
    cardTone: safe.urgency === "Critical" ? "alert" : "civic",
    visualSize: safe.urgency === "Critical" ? "tall" : "standard",
  };
}
