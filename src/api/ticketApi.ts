import type {
  CitizenProgressPayload,
  ComplaintCardModel,
  TrackingPayload,
} from "../types/dashboard";
import type { ComplaintDraft } from "../components/ComplaintSubmissionForm";
import { fetchJson } from "./backendClient";

export interface BackendComplaintResponse {
  id: string;
  ticketId: string;
  title: string;
  summary: string;
  location: string;
  address?: string;
  sector: string;
  coordinates?: ComplaintCardModel["coordinates"];
  locationSource?: ComplaintCardModel["locationSource"];
  category: ComplaintCardModel["category"];
  status: ComplaintCardModel["status"];
  urgency: ComplaintCardModel["urgency"];
  reportedAt: string;
  createdAt: string;
  citizen: ComplaintCardModel["citizen"];
  aiSummary?: string;
  aiClassificationLabel?: string;
  confidence?: number;
  assignedDepartment?: string;
  assignedWorker?: ComplaintCardModel["assignedWorker"];
  media?: ComplaintCardModel["media"];
  metadata?: ComplaintCardModel["metadata"];
  trackingUrl?: string;
  communication?: ComplaintCardModel["communication"];
  resolutionConfirmedAt?: string;
  citizenRating?: number;
  citizenActions?: ComplaintCardModel["citizenActions"];
}

export async function submitComplaint(
  draft: ComplaintDraft,
): Promise<BackendComplaintResponse> {
  const body = new FormData();
  body.append("complaint", draft.complaint);
  body.append("citizenPhone", draft.citizenPhone);
  body.append("language", draft.language);
  body.append("category", draft.category);
  body.append("location", draft.location);
  if (draft.address) body.append("address", draft.address);
  if (draft.latitude !== undefined) body.append("latitude", String(draft.latitude));
  if (draft.longitude !== undefined) body.append("longitude", String(draft.longitude));
  if (draft.locationSource) body.append("locationSource", draft.locationSource);
  draft.images.forEach((image) => body.append("images", image));

  const savedComplaint = await fetchJson<BackendComplaintResponse>("/api/complaints", {
    method: "POST",
    body,
    credentials: "include",
  });

  try {
    return await fetchTicket(savedComplaint.ticketId);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Complaint ticket was generated but could not be verified in the database: ${error.message}`
        : "Complaint ticket was generated but could not be verified in the database.",
    );
  }
}

export async function fetchTicket(ticketId: string): Promise<BackendComplaintResponse> {
  return fetchJson<BackendComplaintResponse>(
    `/api/complaints/${encodeURIComponent(ticketId)}`,
  );
}

export async function fetchComplaints(): Promise<BackendComplaintResponse[]> {
  return fetchJson<BackendComplaintResponse[]>("/api/complaints");
}

export async function fetchMyComplaints(): Promise<BackendComplaintResponse[]> {
  return fetchJson<BackendComplaintResponse[]>("/api/me/complaints", {
    credentials: "include",
  });
}

export async function updateComplaint(
  id: string,
  payload: Partial<BackendComplaintResponse> & {
    status?: ComplaintCardModel["status"] | string;
    note?: string;
  },
): Promise<BackendComplaintResponse> {
  return fetchJson<BackendComplaintResponse>(
    `/api/complaints/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      credentials: "include",
    },
  );
}

export async function updateComplaintWithProof(
  id: string,
  payload: {
    status?: ComplaintCardModel["status"] | string;
    note?: string;
    action?: string;
    workerAction?: string;
    workerStatus?: string;
    workerLat?: number;
    workerLng?: number;
    images?: File[];
  },
): Promise<BackendComplaintResponse> {
  const body = new FormData();
  if (payload.status) body.append("status", payload.status);
  if (payload.note) body.append("note", payload.note);
  if (payload.action) body.append("action", payload.action);
  if (payload.workerAction) body.append("workerAction", payload.workerAction);
  if (payload.workerStatus) body.append("workerStatus", payload.workerStatus);
  if (payload.workerLat !== undefined) body.append("workerLat", String(payload.workerLat));
  if (payload.workerLng !== undefined) body.append("workerLng", String(payload.workerLng));
  payload.images?.forEach((image) => body.append("images", image));

  return fetchJson<BackendComplaintResponse>(
    `/api/complaints/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body,
      credentials: "include",
    },
  );
}

export async function fetchCitizenProgress(
  ticketId: string,
): Promise<CitizenProgressPayload> {
  return fetchJson<CitizenProgressPayload>(
    `/api/citizen/progress/${encodeURIComponent(ticketId)}`,
  );
}

export async function fetchTracking(ticketId: string): Promise<TrackingPayload> {
  return fetchJson<TrackingPayload>(`/api/track/${encodeURIComponent(ticketId)}`);
}

export async function fetchMyComplaintTracking(
  ticketId: string,
): Promise<TrackingPayload> {
  return fetchJson<TrackingPayload>(
    `/api/me/complaints/${encodeURIComponent(ticketId)}/tracking`,
    {
      credentials: "include",
    },
  );
}

export type CitizenComplaintAction =
  | "comment"
  | "reopen"
  | "confirm_resolution"
  | "rate";

export async function submitCitizenComplaintAction(
  ticketId: string,
  payload: {
    action: CitizenComplaintAction;
    note?: string;
    rating?: number;
    images?: File[];
  },
): Promise<BackendComplaintResponse> {
  const body = new FormData();
  body.append("action", payload.action);
  if (payload.note) body.append("note", payload.note);
  if (payload.rating !== undefined) body.append("rating", String(payload.rating));
  payload.images?.forEach((image) => body.append("images", image));

  return fetchJson<BackendComplaintResponse>(
    `/api/me/complaints/${encodeURIComponent(ticketId)}/actions`,
    {
      method: "POST",
      body,
      credentials: "include",
    },
  );
}
