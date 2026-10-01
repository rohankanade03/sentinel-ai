import type {
  ComplaintCategory,
  ComplaintStatus,
  UrgencyLevel,
} from "../types/dashboard";

export interface ApiComplaintRecord {
  id?: string;
  ticketId?: string;
  ticket_id?: string;
  title?: string;
  summary?: string;
  description?: string;
  sector?: string;
  location?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  category?: ComplaintCategory | string;
  status?: ComplaintStatus | string;
  urgency?: UrgencyLevel | "CRITICAL" | string;
  reportedAt?: string;
  timestamp?: string;
  createdAt?: string;
  aiClassificationLabel?: string;
  aiSummary?: string;
  ai_summary?: string;
  assignedDepartment?: string;
  assigned_department?: string;
  media?: Array<{
    id?: string;
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
    format?: string;
  }>;
  metadata?: Array<{
    label: string;
    value: string;
  }>;
}

export type ComplaintDataSource = ApiComplaintRecord;

export interface NormalizedComplaint {
  id: string;
  ticketId: string;
  title: string;
  summary: string;
  sector: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  category: ComplaintCategory | string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  urgencyKey: "CRITICAL" | "High" | "Medium" | "Low";
  createdAt: string;
  reportedAtLabel: string;
  aiSummary: string;
  assignedDepartment: string;
  source: ComplaintDataSource;
}

const monthIndex: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const departmentByCategory: Record<string, string> = {
  Electricity: "Electrical Response Cell",
  Encroachment: "Zonal Enforcement Team",
  "Fire & Emergency": "Emergency Control Room",
  "Noise Pollution": "Environmental Compliance Desk",
  "Public Amenities": "Public Works Support",
  "Public Safety": "Public Safety Coordination",
  "Road & Infrastructure": "Roads and Infrastructure Cell",
  Sanitation: "Sanitation Field Office",
  "Water Supply": "Water Operations Desk",
  Other: "Civic Operations Desk",
};

export const statusStages: ComplaintStatus[] = [
  "Received",
  "Assigned",
  "In Progress",
  "Resolved",
];

export function normalizeUrgency(urgency: string): NormalizedComplaint["urgencyKey"] {
  const normalized = urgency.trim().toLowerCase();

  if (normalized === "critical") {
    return "CRITICAL";
  }

  if (normalized === "high") {
    return "High";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  if (normalized === "low") {
    return "Low";
  }

  return "Medium";
}

function normalizeStatus(status?: string): ComplaintStatus {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "received") {
    return "Received";
  }

  if (normalized === "assigned") {
    return "Assigned";
  }

  if (normalized === "in progress" || normalized === "in_progress") {
    return "In Progress";
  }

  if (normalized === "resolved") {
    return "Resolved";
  }

  return "Received";
}

export function parseComplaintTimestamp(value: string): string {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const match = value.match(
    /^(?<month>[A-Za-z]+)\s+(?<day>\d{1,2}),\s+(?<hour>\d{1,2}):(?<minute>\d{2})\s+(?<period>AM|PM)$/i,
  );

  if (!match?.groups) {
    return new Date().toISOString();
  }

  const month = monthIndex[match.groups.month.slice(0, 3).toLowerCase()] ?? 0;
  const day = Number(match.groups.day);
  const minute = Number(match.groups.minute);
  const rawHour = Number(match.groups.hour);
  const isPm = match.groups.period.toUpperCase() === "PM";
  const hour = rawHour === 12 ? (isPm ? 12 : 0) : rawHour + (isPm ? 12 : 0);

  return new Date(2026, month, day, hour, minute).toISOString();
}

function getMetadataValue(
  complaint: ComplaintDataSource,
  label: string,
): string | undefined {
  return complaint.metadata?.find(
    (item) => item.label.toLowerCase() === label.toLowerCase(),
  )?.value;
}

function toDisplayUrgency(urgencyKey: NormalizedComplaint["urgencyKey"]): UrgencyLevel {
  return urgencyKey === "CRITICAL" ? "Critical" : urgencyKey;
}

function normalizeCoordinates(
  complaint: ComplaintDataSource,
): NormalizedComplaint["coordinates"] {
  if (
    complaint.coordinates &&
    Number.isFinite(complaint.coordinates.lat) &&
    Number.isFinite(complaint.coordinates.lng)
  ) {
    return complaint.coordinates;
  }

  if (
    Number.isFinite(complaint.latitude) &&
    Number.isFinite(complaint.longitude)
  ) {
    return {
      lat: Number(complaint.latitude),
      lng: Number(complaint.longitude),
    };
  }

  return undefined;
}

export function createAiSummary(complaint: {
  category: string;
  sector: string;
  urgencyKey: NormalizedComplaint["urgencyKey"];
  status: ComplaintStatus;
}): string {
  return `${complaint.category} signal in ${complaint.sector}; ${complaint.urgencyKey.toLowerCase()} priority, ${complaint.status.toLowerCase()} response.`;
}

export function normalizeComplaint(complaint: ComplaintDataSource): NormalizedComplaint {
  const ticketId =
    complaint.ticketId ?? complaint.ticket_id ?? complaint.id ?? "SEN-2026-PENDING";
  const sector =
    complaint.sector ??
    complaint.address ??
    complaint.location ??
    getMetadataValue(complaint, "Sector") ??
    "Unmapped sector";
  const status = normalizeStatus(complaint.status);
  const category = complaint.category ?? "Other";
  const urgencyKey = normalizeUrgency(complaint.urgency ?? "Medium");
  const title =
    complaint.title ??
    complaint.summary ??
    complaint.description ??
    "Untitled civic complaint";
  const summary = complaint.summary ?? complaint.description ?? title;
  const timestamp =
    complaint.createdAt ??
    complaint.timestamp ??
    complaint.reportedAt ??
    new Date().toISOString();
  const createdAt = parseComplaintTimestamp(timestamp);

  return {
    id: complaint.id ?? ticketId.toLowerCase(),
    ticketId,
    title,
    summary,
    sector,
    address: complaint.address ?? complaint.location,
    coordinates: normalizeCoordinates(complaint),
    category,
    status,
    urgency: toDisplayUrgency(urgencyKey),
    urgencyKey,
    createdAt,
    reportedAtLabel:
      complaint.reportedAt ?? complaint.timestamp ?? new Date(createdAt).toLocaleString(),
    aiSummary:
      complaint.aiClassificationLabel ??
      complaint.aiSummary ??
      complaint.ai_summary ??
      createAiSummary({ category, sector, urgencyKey, status }),
    assignedDepartment:
      complaint.assignedDepartment ??
      complaint.assigned_department ??
      departmentByCategory[category] ??
      "Civic Operations Desk",
    source: complaint,
  };
}

export function normalizeComplaints(
  complaints: ComplaintDataSource[] = [],
): NormalizedComplaint[] {
  return complaints.map(normalizeComplaint);
}

export function getLatestComplaint(complaints: NormalizedComplaint[]) {
  return [...complaints].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )[0];
}
