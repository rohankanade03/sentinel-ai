import { useMemo, useState } from "react";
import { ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react";
import { ComplaintSubmissionForm } from "../components/ComplaintSubmissionForm";
import type { ComplaintDraft } from "../components/ComplaintSubmissionForm";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ProgressTracker } from "../components/ProgressTracker";
import { StatCard } from "../components/StatCard";
import { TicketConfirmation } from "../components/TicketConfirmation";
import { TicketLookup } from "../components/TicketLookup";
import { submitComplaint } from "../api/ticketApi";
import type { BackendComplaintResponse } from "../api/ticketApi";
import type { ComplaintCardModel, DashboardLanguage, DashboardSnapshot } from "../types/dashboard";
import { dashboardLanguages } from "../types/dashboard";
import { normalizeComplaints } from "../utils/complaintAdapters";

interface UserDashboardProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  onComplaintSaved: (complaint: ComplaintCardModel) => void;
  language: DashboardLanguage;
  onLanguageChange: (language: DashboardLanguage) => void;
}

interface LastSubmission {
  ticketId: string;
  complaintPreview: string;
  location: string;
  category: string;
  trackingUrl?: string;
  communication?: ComplaintCardModel["communication"];
}

const userDashboardCopy: Record<
  DashboardLanguage,
  {
    selectorLabel: string;
    badge: string;
    title: string;
    privacyTitle: string;
    privacyDetail: string;
    triagePending: string;
    receivedAction: string;
    backendActor: string;
    metadataSourceLabel: string;
    metadataSourceValue: string;
    metadataSectorLabel: string;
    saveError: (message: string) => string;
    genericSaveError: string;
    stats: {
      tickets: string;
      ticketsDelta: string;
      open: string;
      openDelta: string;
      resolved: string;
      resolvedDelta: string;
    };
    nextStepsTitle: string;
    nextStepsDetail: string;
    steps: string[];
  }
> = {
  en: {
    selectorLabel: "Dashboard language",
    badge: "User dashboard",
    title: "File, track, and understand civic complaints.",
    privacyTitle: "Privacy-aware intake",
    privacyDetail: "Saved through the backend complaint service",
    triagePending: "Backend triage pending",
    receivedAction: "Received via backend API",
    backendActor: "Civic Operations Desk",
    metadataSourceLabel: "Source",
    metadataSourceValue: "Backend API",
    metadataSectorLabel: "Sector",
    saveError: (message) =>
      `Complaint was not saved: ${message}. Start the backend with npm run dev:backend and try again.`,
    genericSaveError:
      "Complaint was not saved. Start the backend with npm run dev:backend and try again.",
    stats: {
      tickets: "Trackable tickets",
      ticketsDelta: "Existing plus saved submissions",
      open: "Open complaints",
      openDelta: "Received, assigned, or active",
      resolved: "Resolved",
      resolvedDelta: "Closed with audit history",
    },
    nextStepsTitle: "Citizen next steps",
    nextStepsDetail: "Ticket generated, triage pending, status updates ready.",
    steps: ["Received", "Assigned", "In Progress", "Resolved"],
  },
  hi: {
    selectorLabel: "डैशबोर्ड भाषा",
    badge: "उपयोगकर्ता डैशबोर्ड",
    title: "नागरिक शिकायत दर्ज करें, ट्रैक करें और समझें।",
    privacyTitle: "गोपनीयता-सुरक्षित शिकायत दर्ज",
    privacyDetail: "बैकएंड शिकायत सेवा से सुरक्षित",
    triagePending: "बैकएंड जांच बाकी है",
    receivedAction: "बैकएंड API से प्राप्त",
    backendActor: "नागरिक संचालन डेस्क",
    metadataSourceLabel: "स्रोत",
    metadataSourceValue: "बैकएंड API",
    metadataSectorLabel: "सेक्टर",
    saveError: (message) =>
      `शिकायत सेव नहीं हुई: ${message}. बैकएंड को npm run dev:backend से शुरू करें और फिर कोशिश करें।`,
    genericSaveError:
      "शिकायत सेव नहीं हुई। बैकएंड को npm run dev:backend से शुरू करें और फिर कोशिश करें।",
    stats: {
      tickets: "ट्रैक होने वाले टिकट",
      ticketsDelta: "मौजूदा और सेव की गई शिकायतें",
      open: "खुली शिकायतें",
      openDelta: "प्राप्त, असाइन या सक्रिय",
      resolved: "हल हो गईं",
      resolvedDelta: "ऑडिट इतिहास के साथ बंद",
    },
    nextStepsTitle: "नागरिक के अगले कदम",
    nextStepsDetail: "टिकट बन गया, जांच बाकी है, स्थिति अपडेट तैयार हैं।",
    steps: ["प्राप्त", "असाइन", "काम जारी", "हल"],
  },
  hinglish: {
    selectorLabel: "Dashboard language",
    badge: "User dashboard",
    title: "Civic complaint file, track aur samjhein.",
    privacyTitle: "Privacy-aware intake",
    privacyDetail: "Backend complaint service se save hota hai",
    triagePending: "Backend triage pending",
    receivedAction: "Backend API se received",
    backendActor: "Civic Operations Desk",
    metadataSourceLabel: "Source",
    metadataSourceValue: "Backend API",
    metadataSectorLabel: "Sector",
    saveError: (message) =>
      `Complaint save nahi hui: ${message}. Backend ko npm run dev:backend se start karke phir try karein.`,
    genericSaveError:
      "Complaint save nahi hui. Backend ko npm run dev:backend se start karke phir try karein.",
    stats: {
      tickets: "Trackable tickets",
      ticketsDelta: "Existing plus saved submissions",
      open: "Open complaints",
      openDelta: "Received, assigned, ya active",
      resolved: "Resolved",
      resolvedDelta: "Audit history ke saath closed",
    },
    nextStepsTitle: "Citizen next steps",
    nextStepsDetail: "Ticket generate ho gaya, triage pending hai, status updates ready hain.",
    steps: ["Received", "Assigned", "In Progress", "Resolved"],
  },
};

function createComplaintFromBackend(
  response: BackendComplaintResponse,
  copy: (typeof userDashboardCopy)[DashboardLanguage],
): ComplaintCardModel {
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
      response.aiClassificationLabel ?? response.aiSummary ?? copy.triagePending,
    confidence: response.confidence,
    audit: {
      latestAction: copy.receivedAction,
      actor: response.assignedDepartment ?? copy.backendActor,
      timestamp: new Date(response.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    metadata: response.metadata ?? [
      { label: copy.metadataSourceLabel, value: copy.metadataSourceValue },
      { label: copy.metadataSectorLabel, value: response.sector },
    ],
    media: response.media,
    trackingUrl: response.trackingUrl,
    communication: response.communication,
    assignedDepartment: response.assignedDepartment,
    assignedWorker: response.assignedWorker,
    resolutionConfirmedAt: response.resolutionConfirmedAt,
    citizenRating: response.citizenRating,
    citizenActions: response.citizenActions,
    cardTone: "civic",
    visualSize: "standard",
  };
}

export function UserDashboard({
  snapshot,
  isLoading,
  onComplaintSaved,
  language,
  onLanguageChange,
}: UserDashboardProps) {
  const copy = userDashboardCopy[language];
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const allComplaints = snapshot?.complaints ?? [];
  const normalized = useMemo(() => normalizeComplaints(allComplaints), [allComplaints]);
  const latestComplaint = normalized[0];
  const openCount = normalized.filter((complaint) => complaint.status !== "Resolved").length;
  const resolvedCount = normalized.filter((complaint) => complaint.status === "Resolved").length;

  async function handleSubmit(draft: ComplaintDraft) {
    try {
      setSubmissionError(null);
      const complaint = createComplaintFromBackend(await submitComplaint(draft), copy);

      onComplaintSaved(complaint);
      setLastSubmission({
        ticketId: complaint.ticketId ?? complaint.id,
        complaintPreview: draft.complaint,
        location: complaint.address || complaint.location || draft.location,
        category: complaint.category,
        trackingUrl: complaint.trackingUrl,
        communication: complaint.communication,
      });
    } catch (error) {
      setLastSubmission(null);
      setSubmissionError(
        error instanceof Error
          ? copy.saveError(error.message)
          : copy.genericSaveError,
      );
      throw error;
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton variant="stat" />
        <LoadingSkeleton variant="complaint" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <span className="text-xs font-black uppercase text-teal-700">
          {copy.badge}
        </span>
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              {copy.title}
            </h1>
          </div>
          <div className="grid gap-3 rounded-xl border border-line bg-white/75 p-4">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase text-teal-700">
                {copy.selectorLabel}
              </span>
              <select
                className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink outline-none transition focus:border-teal-500"
                value={language}
                onChange={(event) =>
                  onLanguageChange(event.target.value as DashboardLanguage)
                }
              >
                {dashboardLanguages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-teal-100 text-teal-700">
                <ShieldCheck size={20} />
              </span>
              <div>
                <strong className="block text-sm text-ink">{copy.privacyTitle}</strong>
                <span className="text-xs font-semibold text-muted">
                  {copy.privacyDetail}
                </span>
              </div>
            </div>
            {latestComplaint ? (
              <ProgressTracker status={latestComplaint.status} language={language} compact />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="grid gap-6">
          <ComplaintSubmissionForm
            errorMessage={submissionError}
            onSubmit={handleSubmit}
            language={language}
          />
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              stat={{
                id: "user-open",
                label: copy.stats.tickets,
                value: String(normalized.length),
                delta: copy.stats.ticketsDelta,
                tone: "teal",
              }}
            />
            <StatCard
              stat={{
                id: "user-active",
                label: copy.stats.open,
                value: String(openCount),
                delta: copy.stats.openDelta,
                tone: "amber",
              }}
            />
            <StatCard
              stat={{
                id: "user-resolved",
                label: copy.stats.resolved,
                value: String(resolvedCount),
                delta: copy.stats.resolvedDelta,
                tone: "emerald",
              }}
            />
          </section>
          {lastSubmission ? <TicketConfirmation {...lastSubmission} language={language} /> : null}
        </div>

        <div className="grid content-start gap-6">
          <TicketLookup complaints={allComplaints} language={language} />
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <FileSearch size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-ink">{copy.nextStepsTitle}</h2>
                <p className="text-sm font-semibold text-muted">
                  {copy.nextStepsDetail}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {copy.steps.map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-lg border border-line bg-slate-50 p-3"
                >
                  <ClipboardCheck size={17} className="text-teal-700" />
                  <span className="text-sm font-bold text-ink">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
