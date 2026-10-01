export type ComplaintStatus = "Received" | "Assigned" | "In Progress" | "Resolved";

export type DashboardLanguage = "en" | "hi" | "hinglish";

export const dashboardLanguages: Array<{
  label: string;
  value: DashboardLanguage;
}> = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Hinglish", value: "hinglish" },
];

export type UrgencyLevel = "Critical" | "High" | "Medium" | "Low";

export type ComplaintCategory =
  | "Electricity"
  | "Encroachment"
  | "Fire & Emergency"
  | "Noise Pollution"
  | "Public Safety"
  | "Public Amenities"
  | "Sanitation"
  | "Road & Infrastructure"
  | "Water Supply"
  | "Other";

export interface CitizenPreview {
  maskedName: string;
  maskedPhone: string;
}

export interface AuditPreview {
  latestAction: string;
  actor: string;
  timestamp: string;
}

export interface ComplaintCoordinates {
  lat: number;
  lng: number;
}

export interface ComplaintMedia {
  id?: string;
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

export type CommunicationStatus =
  | "queued"
  | "accepted"
  | "processing"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "skipped"
  | "retrying"
  | "answered"
  | "no-answer"
  | "busy"
  | "completed"
  | "canceled"
  | "undelivered";

export interface CommunicationLogEntry {
  _id?: string;
  id?: string;
  ticketId: string;
  type: "voice_call" | "whatsapp" | "sms" | "email" | "officer_alert" | "tracking_link";
  audience: "citizen" | "officer" | "admin" | "system";
  status: CommunicationStatus;
  attempts?: number;
  maxAttempts?: number;
  durationSeconds?: number;
  language?: string;
  message?: string;
  trackingUrl?: string;
  eventType?: string;
  lastError?: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  completedAt?: string;
}

export interface CommunicationPreview {
  callStatus?: CommunicationStatus;
  whatsappStatus?: CommunicationStatus;
  smsStatus?: CommunicationStatus;
  emergencyAlertStatus?: CommunicationStatus;
  lastUpdatedAt?: string;
  history?: CommunicationLogEntry[];
}

export interface TrackingSla {
  label: string;
  dueAt?: string;
  status: string;
  responseHours?: number;
  remainingSeconds?: number | null;
  escalationStatus?: string;
}

export interface ComplaintCardModel {
  id: string;
  ticketId?: string;
  title: string;
  summary: string;
  location: string;
  address?: string;
  sector?: string;
  coordinates?: ComplaintCoordinates;
  locationSource?: "browser" | "manual-pin" | "import" | "api" | string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  reportedAt: string;
  citizen?: CitizenPreview;
  aiClassificationLabel?: string;
  confidence?: number;
  assignedDepartment?: string;
  assignedWorker?: {
    workerId?: string;
    name?: string;
    role?: string;
    status?: string;
    acceptedAt?: string;
    checkInAt?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  audit?: AuditPreview;
  cardTone?: "calm" | "alert" | "civic" | "field" | "health";
  visualSize?: "compact" | "standard" | "tall" | "wide";
  media?: ComplaintMedia[];
  trackingUrl?: string;
  communication?: CommunicationPreview;
  resolutionConfirmedAt?: string;
  citizenRating?: number;
  citizenActions?: Array<{
    action: "comment" | "reopen" | "confirm_resolution" | "rate";
    note?: string;
    rating?: number;
    createdAt?: string;
  }>;
  metadata: Array<{
    label: string;
    value: string;
  }>;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "teal" | "emerald" | "amber" | "rose";
}

export interface StatusLane {
  id: ComplaintStatus;
  label: string;
  count: number;
  description: string;
  tone: "rose" | "blue" | "amber" | "emerald";
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface StatusFilterOption {
  label: string;
  value: ComplaintStatus | "all";
}

export interface NavigationItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface DashboardSnapshot {
  generatedAt: string;
  stats: DashboardStat[];
  statuses: StatusLane[];
  complaints: ComplaintCardModel[];
  categories: FilterOption[];
  statusFilters: StatusFilterOption[];
}

export interface DashboardFilters {
  query: string;
  category: string;
  status: ComplaintStatus | "all";
}

export interface AuditTrailEntry {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  fromStatus?: ComplaintStatus;
  toStatus?: ComplaintStatus;
  note?: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

export interface AuditLogEntry extends AuditTrailEntry {
  complaintTitle?: string;
  category?: string;
  sector?: string;
  currentStatus?: ComplaintStatus;
  assignedDepartment?: string;
}

export interface CitizenProgressStep {
  id: "Received" | "Assigned" | "In Progress" | "Fixed";
  label: string;
  completed: boolean;
}

export interface CitizenProgressPayload {
  ticketId: string;
  title: string;
  summary: string;
  category: string;
  sector: string;
  status: ComplaintStatus;
  citizen: CitizenPreview;
  assignedDepartment: string;
  createdAt: string;
  updatedAt: string;
  priority?: string;
  trackingUrl?: string;
  sla?: TrackingSla;
  communications?: CommunicationLogEntry[];
  tracker: CitizenProgressStep[];
  auditTrail: AuditTrailEntry[];
}

export interface TrackingPayload extends CitizenProgressPayload {
  location?: string;
  assignedOfficer?: string;
  media?: ComplaintMedia[];
  resolutionConfirmedAt?: string;
  citizenRating?: number;
  citizenActions?: Array<{
    action: "comment" | "reopen" | "confirm_resolution" | "rate";
    note?: string;
    rating?: number;
    createdAt?: string;
  }>;
  officerActions?: Array<{
    action?: string;
    note?: string;
    createdAt?: string;
    timestamp?: string;
  }>;
}
