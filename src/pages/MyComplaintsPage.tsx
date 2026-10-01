import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileImage,
  Filter,
  History,
  ImagePlus,
  MapPin,
  MessageSquarePlus,
  RefreshCcw,
  Search,
  SendHorizonal,
  ShieldCheck,
  Star,
  TimerReset,
  X,
} from "lucide-react";
import { io } from "socket.io-client";
import { getApiBaseUrl } from "../api/backendClient";
import {
  fetchMyComplaintTracking,
  fetchMyComplaints,
  submitCitizenComplaintAction,
  type BackendComplaintResponse,
  type CitizenComplaintAction,
} from "../api/ticketApi";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge, type BadgeTone } from "../components/StatusBadge";
import type {
  ComplaintCardModel,
  ComplaintCategory,
  ComplaintStatus,
  TrackingPayload,
  UrgencyLevel,
} from "../types/dashboard";
import { cn } from "../utils/cn";

type SortMode = "latest" | "oldest";
type DerivedStatus =
  | "Submitted"
  | "Under AI Review"
  | "Assigned to Department"
  | "Officer Assigned"
  | "In Progress"
  | "Escalated"
  | "Awaiting Citizen Confirmation"
  | "Resolved"
  | "Closed";

interface MyComplaintsPageProps {
  activeComplaint?: ComplaintCardModel | null;
  isLoading: boolean;
}

interface ActionState {
  action: CitizenComplaintAction;
  note: string;
  rating: number;
  images: File[];
}

const defaultActionState: ActionState = {
  action: "comment",
  note: "",
  rating: 5,
  images: [],
};

const statusOrder: DerivedStatus[] = [
  "Submitted",
  "Under AI Review",
  "Assigned to Department",
  "Officer Assigned",
  "In Progress",
  "Escalated",
  "Awaiting Citizen Confirmation",
  "Resolved",
  "Closed",
];

const publicStatusLabels: Record<ComplaintStatus, DerivedStatus> = {
  Received: "Submitted",
  Assigned: "Assigned to Department",
  "In Progress": "In Progress",
  Resolved: "Resolved",
};

function toComplaintCard(response: BackendComplaintResponse): ComplaintCardModel {
  return {
    id: response.id,
    ticketId: response.ticketId,
    title: response.title,
    summary: response.summary,
    location: response.location || response.sector,
    address: response.address,
    sector: response.sector,
    coordinates: response.coordinates,
    locationSource: response.locationSource,
    category: response.category,
    status: response.status,
    urgency: response.urgency,
    reportedAt: response.reportedAt,
    citizen: response.citizen,
    aiClassificationLabel:
      response.aiClassificationLabel ?? response.aiSummary ?? response.summary,
    confidence: response.confidence,
    assignedDepartment: response.assignedDepartment,
    assignedWorker: response.assignedWorker,
    metadata: [
      { label: "Created At", value: response.createdAt },
      ...(response.metadata ?? []),
    ],
    media: response.media,
    trackingUrl: response.trackingUrl,
    communication: response.communication,
    resolutionConfirmedAt: response.resolutionConfirmedAt,
    citizenRating: response.citizenRating,
    citizenActions: response.citizenActions,
    audit: {
      latestAction: response.status,
      actor: response.assignedDepartment ?? "Civic Operations Desk",
      timestamp: new Date(response.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    cardTone: response.urgency === "Critical" ? "alert" : "civic",
    visualSize: response.urgency === "Critical" ? "tall" : "standard",
  };
}

function getCreatedAt(complaint: ComplaintCardModel) {
  const createdAt = complaint.metadata.find((item) => item.label === "Created At")?.value;
  if (createdAt) return new Date(createdAt).toLocaleString();
  return complaint.reportedAt || "";
}

function getSortTime(complaint: ComplaintCardModel) {
  const createdAt = complaint.metadata.find((item) => item.label === "Created At")?.value;
  const value = createdAt || complaint.reportedAt;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDerivedStatus(complaint: ComplaintCardModel, tracking?: TrackingPayload | null): DerivedStatus {
  if (tracking?.resolutionConfirmedAt || complaint.resolutionConfirmedAt) return "Closed";
  if (complaint.status === "Resolved") return "Awaiting Citizen Confirmation";
  if (tracking?.sla?.escalationStatus === "Escalated") return "Escalated";
  if (tracking?.assignedOfficer) return "Officer Assigned";
  return publicStatusLabels[complaint.status] ?? "Submitted";
}

function getPriorityBadges(complaint: ComplaintCardModel, tracking?: TrackingPayload | null) {
  const badges: string[] = [];
  if (complaint.urgency === "High") badges.push("HIGH PRIORITY");
  if (complaint.urgency === "Critical") badges.push("EMERGENCY");
  if (tracking?.officerActions?.some((item) => /inspect/i.test(item.action || item.note || ""))) {
    badges.push("INSPECTION SCHEDULED");
  }
  if (complaint.metadata.some((item) => /duplicate/i.test(`${item.label} ${item.value}`))) {
    badges.push("DUPLICATE MERGED");
  }
  return badges;
}

function getSlaText(complaint: ComplaintCardModel, tracking?: TrackingPayload | null) {
  if (tracking?.sla?.label) return tracking.sla.label;
  if (complaint.urgency === "Critical") return "30 minutes";
  if (complaint.urgency === "High") return "4 hours";
  if (complaint.urgency === "Low") return "72 hours";
  return "24 hours";
}

function formatRemaining(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "SLA pending";
  if (seconds <= 0) return "SLA due";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

function statusTone(status: DerivedStatus): BadgeTone {
  if (status === "Closed" || status === "Resolved") return "success";
  if (status === "Escalated") return "critical";
  if (status === "Awaiting Citizen Confirmation") return "high";
  return "info";
}

export function MyComplaintsPage({ activeComplaint, isLoading }: MyComplaintsPageProps) {
  const [complaints, setComplaints] = useState<ComplaintCardModel[]>([]);
  const [selectedTicket, setSelectedTicket] = useState("");
  const [tracking, setTracking] = useState<TrackingPayload | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionState, setActionState] = useState<ActionState>(defaultActionState);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DerivedStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<UrgencyLevel | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  async function loadComplaints(showLoading = false) {
    try {
      if (showLoading) setIsListLoading(true);
      setError("");
      const nextComplaints = (await fetchMyComplaints()).map(toComplaintCard);
      setComplaints(nextComplaints);
      if (!selectedTicket && nextComplaints[0]?.ticketId) {
        setSelectedTicket(nextComplaints[0].ticketId);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Complaints could not be loaded.");
    } finally {
      setIsListLoading(false);
    }
  }

  async function loadTracking(ticketId: string) {
    if (!ticketId) return;
    try {
      setIsTrackingLoading(true);
      setActionError("");
      setTracking(await fetchMyComplaintTracking(ticketId));
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : "Tracking could not be loaded.");
      setTracking(null);
    } finally {
      setIsTrackingLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints(true);
  }, []);

  useEffect(() => {
    if (activeComplaint?.ticketId) {
      setSelectedTicket(activeComplaint.ticketId);
    }
  }, [activeComplaint?.ticketId]);

  useEffect(() => {
    loadTracking(selectedTicket);
  }, [selectedTicket]);

  useEffect(() => {
    const socket = io(getApiBaseUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    complaints.forEach((complaint) => {
      if (complaint.ticketId) socket.emit("ticket:join", complaint.ticketId);
    });

    const handleUpdate = () => {
      loadComplaints(false);
      if (selectedTicket) loadTracking(selectedTicket);
    };

    socket.on("complaint:updated", handleUpdate);
    socket.on("communication:updated", handleUpdate);

    return () => {
      complaints.forEach((complaint) => {
        if (complaint.ticketId) socket.emit("ticket:leave", complaint.ticketId);
      });
      socket.disconnect();
    };
  }, [complaints.map((complaint) => complaint.ticketId).join("|"), selectedTicket]);

  const categories = useMemo(
    () => Array.from(new Set(complaints.map((complaint) => complaint.category))).sort(),
    [complaints],
  );

  const visibleComplaints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return complaints
      .filter((complaint) => {
        const derivedStatus = getDerivedStatus(
          complaint,
          complaint.ticketId === selectedTicket ? tracking : null,
        );
        const searchable = [
          complaint.title,
          complaint.summary,
          complaint.ticketId,
          complaint.category,
          complaint.urgency,
          complaint.location,
          complaint.assignedDepartment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          (statusFilter === "all" || derivedStatus === statusFilter) &&
          (categoryFilter === "all" || complaint.category === categoryFilter) &&
          (priorityFilter === "all" || complaint.urgency === priorityFilter)
        );
      })
      .sort((first, second) => {
        const firstTime = getSortTime(first);
        const secondTime = getSortTime(second);
        return sortMode === "latest" ? secondTime - firstTime : firstTime - secondTime;
      });
  }, [categoryFilter, complaints, priorityFilter, query, selectedTicket, sortMode, statusFilter, tracking]);

  const selectedComplaint = complaints.find(
    (complaint) => complaint.ticketId === selectedTicket,
  );

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) return;

    try {
      setActionError("");
      await submitCitizenComplaintAction(selectedTicket, actionState);
      setActionState(defaultActionState);
      await Promise.all([loadComplaints(false), loadTracking(selectedTicket)]);
    } catch (submitError) {
      setActionError(
        submitError instanceof Error ? submitError.message : "Action could not be saved.",
      );
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setActionState((current) => ({
      ...current,
      images: Array.from(event.target.files || []).slice(0, 5),
    }));
    event.target.value = "";
  }

  if (isLoading || isListLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton variant="stat" />
        <LoadingSkeleton variant="complaint" />
        <LoadingSkeleton variant="complaint" />
      </div>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <ShieldCheck size={14} />
          My Complaints
        </StatusBadge>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black text-ink sm:text-5xl">My Complaints</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">
              {complaints.length} complaint{complaints.length === 1 ? "" : "s"} linked to your account.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
            Live
          </span>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(130px,180px))]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              className="min-h-11 w-full rounded-lg border border-line bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:bg-white"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticket, title, location"
            />
          </label>
          <Select value={statusFilter} onChange={setStatusFilter} icon={<Filter size={15} />}>
            <option value="all">All status</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
          <Select value={priorityFilter} onChange={setPriorityFilter}>
            <option value="all">All priority</option>
            {(["Critical", "High", "Medium", "Low"] as UrgencyLevel[]).map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </Select>
          <Select value={sortMode} onChange={setSortMode}>
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={<AlertTriangle size={24} />}
          title="My Complaints unavailable"
          description={error}
        />
      ) : null}

      {!error && !complaints.length ? (
        <EmptyState
          icon={<MessageSquarePlus size={24} />}
          title="No complaints yet"
          description="Submit your first complaint from the User Dashboard."
        />
      ) : null}

      {complaints.length ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="grid content-start gap-4">
            {visibleComplaints.map((complaint) => (
              <ComplaintOrderCard
                key={complaint.id}
                complaint={complaint}
                derivedStatus={getDerivedStatus(
                  complaint,
                  complaint.ticketId === selectedTicket ? tracking : null,
                )}
                isActive={complaint.ticketId === selectedTicket}
                onSelect={() => setSelectedTicket(complaint.ticketId || complaint.id)}
              />
            ))}
            {!visibleComplaints.length ? (
              <EmptyState
                icon={<Search size={24} />}
                title="No matching complaints"
                description="Try a different search or filter."
              />
            ) : null}
          </div>

          <TrackingPanel
            complaint={selectedComplaint}
            tracking={tracking}
            isLoading={isTrackingLoading}
            actionState={actionState}
            actionError={actionError}
            onActionChange={setActionState}
            onImageChange={handleImageChange}
            onActionSubmit={handleActionSubmit}
          />
        </div>
      ) : null}
    </section>
  );
}

function Select<T extends string>({
  value,
  onChange,
  children,
  icon,
}: {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <label className="relative">
      {icon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
      <select
        className={cn(
          "min-h-11 w-full appearance-none rounded-lg border border-line bg-slate-50 pr-9 text-sm font-black text-ink outline-none transition focus:border-teal-500 focus:bg-white",
          icon ? "pl-9" : "pl-3",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
    </label>
  );
}

function ComplaintOrderCard({
  complaint,
  derivedStatus,
  isActive,
  onSelect,
}: {
  complaint: ComplaintCardModel;
  derivedStatus: DerivedStatus;
  isActive: boolean;
  onSelect: () => void;
}) {
  const badges = getPriorityBadges(complaint);

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lift",
        isActive ? "border-teal-300 ring-2 ring-teal-100" : "border-line",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(derivedStatus)}>{derivedStatus}</StatusBadge>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">
              {complaint.urgency}
            </span>
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase text-amber-800 ring-1 ring-amber-100">
                {badge}
              </span>
            ))}
          </div>
          <h2 className="mt-3 text-xl font-black leading-tight text-ink">{complaint.title}</h2>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-2">
            <span>Ticket: <strong className="text-ink">{complaint.ticketId}</strong></span>
            <span>Category: <strong className="text-ink">{complaint.category}</strong></span>
            <span>Submitted: <strong className="text-ink">{getCreatedAt(complaint)}</strong></span>
            <span>Department: <strong className="text-ink">{complaint.assignedDepartment || "Assignment pending"}</strong></span>
          </div>
        </div>

        <button
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
          type="button"
          onClick={onSelect}
        >
          <History size={16} />
          Track Complaint
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50 p-3 text-sm sm:grid-cols-3">
        <span className="inline-flex items-center gap-2 font-semibold text-muted">
          <TimerReset size={15} />
          SLA: <strong className="text-ink">{getSlaText(complaint)}</strong>
        </span>
        <span className="inline-flex items-center gap-2 font-semibold text-muted sm:col-span-2">
          <MapPin size={15} />
          <strong className="truncate text-ink">{complaint.location || "Location pending"}</strong>
        </span>
      </div>
    </article>
  );
}

function TrackingPanel({
  complaint,
  tracking,
  isLoading,
  actionState,
  actionError,
  onActionChange,
  onImageChange,
  onActionSubmit,
}: {
  complaint?: ComplaintCardModel;
  tracking: TrackingPayload | null;
  isLoading: boolean;
  actionState: ActionState;
  actionError: string;
  onActionChange: (state: ActionState) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onActionSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!complaint) {
    return (
      <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <EmptyState
          icon={<History size={24} />}
          title="Select a complaint"
          description="Choose a complaint to view live tracking."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <aside className="grid content-start gap-4">
        <LoadingSkeleton variant="complaint" />
        <LoadingSkeleton variant="complaint" />
      </aside>
    );
  }

  const derivedStatus = getDerivedStatus(complaint, tracking);
  const canConfirm = complaint.status === "Resolved" && !tracking?.resolutionConfirmedAt;
  const canReopen = complaint.status === "Resolved";

  return (
    <aside className="grid content-start gap-4">
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase text-teal-700">{complaint.ticketId}</span>
            <h2 className="mt-1 text-2xl font-black text-ink">{complaint.title}</h2>
          </div>
          <StatusBadge tone={statusTone(derivedStatus)}>{derivedStatus}</StatusBadge>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">{complaint.summary}</p>

        <dl className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="font-black text-slate-400">SLA</dt>
            <dd className="font-bold text-ink">{tracking?.sla?.label || getSlaText(complaint)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-black text-slate-400">Countdown</dt>
            <dd className="font-bold text-ink">{formatRemaining(tracking?.sla?.remainingSeconds)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-black text-slate-400">Department</dt>
            <dd className="text-right font-bold text-ink">{complaint.assignedDepartment || tracking?.assignedDepartment}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="font-black text-slate-400">Officer</dt>
            <dd className="text-right font-bold text-ink">{tracking?.assignedOfficer || "Pending"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 size={18} className="text-teal-700" />
          <h3 className="text-xl font-black text-ink">Timeline</h3>
        </div>
        <div className="grid gap-3">
          {(tracking?.auditTrail || []).map((entry, index) => (
            <div key={entry.id} className="grid grid-cols-[28px_1fr] gap-3">
              <span className={cn("mt-1 grid size-7 place-items-center rounded-full", index === 0 ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500")}>
                <CheckCircle2 size={15} />
              </span>
              <article className="rounded-lg border border-line bg-slate-50 p-3">
                <strong className="text-sm text-ink">{entry.action}</strong>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {entry.actorName} · {new Date(entry.timestamp).toLocaleString()}
                </p>
                {entry.note ? <p className="mt-2 text-sm leading-6 text-muted">{entry.note}</p> : null}
              </article>
            </div>
          ))}
          {!tracking?.auditTrail?.length ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-sm font-semibold text-muted">
              Timeline will appear as updates are recorded.
            </p>
          ) : null}
        </div>
      </section>

      {tracking?.media?.length || complaint.media?.length ? (
        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileImage size={18} className="text-blue-700" />
            <h3 className="text-xl font-black text-ink">Proof</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(tracking?.media || complaint.media || []).map((item) => (
              <a key={item.id || item.url} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-line">
                <img className="h-28 w-full object-cover" src={item.url} alt="Complaint proof" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquarePlus size={18} className="text-violet-700" />
          <h3 className="text-xl font-black text-ink">Citizen Actions</h3>
        </div>
        <form className="grid gap-3" onSubmit={onActionSubmit}>
          <Select
            value={actionState.action}
            onChange={(action) => onActionChange({ ...actionState, action })}
          >
            <option value="comment">Add comment</option>
            <option value="reopen" disabled={!canReopen}>Reopen complaint</option>
            <option value="confirm_resolution" disabled={!canConfirm}>Confirm resolution</option>
            <option value="rate">Rate handling</option>
          </Select>

          {actionState.action === "rate" ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border transition",
                    actionState.rating >= rating
                      ? "border-amber-200 bg-amber-50 text-amber-600"
                      : "border-line bg-slate-50 text-slate-400",
                  )}
                  type="button"
                  onClick={() => onActionChange({ ...actionState, rating })}
                  aria-label={`${rating} star rating`}
                >
                  <Star size={18} fill="currentColor" />
                </button>
              ))}
            </div>
          ) : null}

          <textarea
            className="min-h-24 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none transition focus:border-teal-500 focus:bg-white"
            value={actionState.note}
            onChange={(event) => onActionChange({ ...actionState, note: event.target.value })}
            placeholder="Add an update for the civic team"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-black text-teal-700 transition hover:bg-teal-100">
              <ImagePlus size={16} />
              Add proof
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onImageChange}
              />
            </label>
            {actionState.images.length ? (
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                type="button"
                onClick={() => onActionChange({ ...actionState, images: [] })}
              >
                <X size={15} />
                {actionState.images.length} selected
              </button>
            ) : null}
          </div>

          {actionError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              {actionError}
            </p>
          ) : null}

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
            type="submit"
          >
            {actionState.action === "reopen" ? <RefreshCcw size={16} /> : <SendHorizonal size={16} />}
            Save Action
          </button>
        </form>
      </section>
    </aside>
  );
}
