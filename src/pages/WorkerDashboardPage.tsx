import "leaflet/dist/leaflet.css";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crosshair,
  ImagePlus,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldAlert,
  TimerReset,
  UploadCloud,
  UserCheck,
  Wrench,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { updateComplaintWithProof } from "../api/ticketApi";
import type { AuthUser } from "../api/authApi";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import { bhopalWorkers, findWorkerById, type BhopalWorker } from "../data/bhopalWorkers";
import type { ComplaintCardModel, DashboardLanguage, DashboardSnapshot } from "../types/dashboard";
import { dashboardLanguages } from "../types/dashboard";
import { cn } from "../utils/cn";

interface WorkerDashboardPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  user: AuthUser;
  language: DashboardLanguage;
  onLanguageChange: (language: DashboardLanguage) => void;
}

type Availability = "Available" | "Busy" | "Offline" | "On Field";

const workerStatuses = [
  {
    labels: {
      en: "On The Way",
      hi: "रास्ते में",
      hinglish: "Raaste mein",
    },
    status: "In Progress",
    action: "On The Way",
  },
  {
    labels: {
      en: "Inspection Started",
      hi: "निरीक्षण शुरू",
      hinglish: "Inspection start",
    },
    status: "In Progress",
    action: "Inspection Started",
  },
  {
    labels: {
      en: "Work In Progress",
      hi: "काम जारी",
      hinglish: "Kaam chal raha hai",
    },
    status: "In Progress",
    action: "Work In Progress",
  },
  {
    labels: {
      en: "Waiting For Materials",
      hi: "सामग्री का इंतजार",
      hinglish: "Materials ka wait",
    },
    status: "In Progress",
    action: "Waiting For Materials",
  },
  {
    labels: {
      en: "Resolved",
      hi: "हल",
      hinglish: "Resolved",
    },
    status: "Resolved",
    action: "Resolved",
  },
];

const workerCopy: Record<
  DashboardLanguage,
  {
    selectorLabel: string;
    badge: string;
    title: (zone: string) => string;
    intro: string;
    availability: Record<Availability, string>;
    updateNote: (name: string, action: string) => string;
    updateSuccess: (action: string, ticket: string) => string;
    updateFailed: string;
    nearbyTitle: string;
    radiusLabel: string;
    noNearby: string;
    emergencyTitle: string;
    noEmergency: string;
    assignedTitle: string;
    noAssigned: string;
    selectedTask: string;
    slaCountdown: string;
    navigation: string;
    assignedWorker: string;
    gpsCheckIn: string;
    sending: string;
    uploadProof: string;
    proofReady: (count: number) => string;
    emergency: string;
    kmAway: (distance: string) => string;
    sla: string;
    matchesDepartment: (department: string) => string;
    crossTeamTask: string;
    view: string;
    claiming: string;
    accept: string;
    yourGpsLocation: string;
    statuses: Record<ComplaintCardModel["status"], string>;
  }
> = {
  en: {
    selectorLabel: "Dashboard language",
    badge: "Worker Dashboard",
    title: (zone) => `Field tasks near ${zone}`,
    intro:
      "Accept nearby complaints, update work status, check in by GPS, and upload proof from one mobile-first workspace.",
    availability: {
      Available: "Available",
      Busy: "Busy",
      Offline: "Offline",
      "On Field": "On Field",
    },
    updateNote: (name, action) => `${name} marked task as ${action}.`,
    updateSuccess: (action, ticket) =>
      `${action} update sent for ${ticket}. Citizens and admins will see it live.`,
    updateFailed: "Worker update failed.",
    nearbyTitle: "Nearby complaints",
    radiusLabel: "1 km priority radius",
    noNearby: "No GPS-tagged complaints are within your radius yet.",
    emergencyTitle: "Emergency alerts",
    noEmergency: "No emergency complaints near this worker.",
    assignedTitle: "Assigned complaints",
    noAssigned: "Accepted tasks will appear here.",
    selectedTask: "Selected task",
    slaCountdown: "SLA countdown",
    navigation: "Navigation",
    assignedWorker: "Assigned worker",
    gpsCheckIn: "GPS Check-in at site",
    sending: "Sending...",
    uploadProof: "Upload proof images",
    proofReady: (count) =>
      `${count} proof image${count === 1 ? "" : "s"} ready for the Resolved update.`,
    emergency: "Emergency",
    kmAway: (distance) => `${distance} km away`,
    sla: "SLA",
    matchesDepartment: (department) => `Matches ${department}`,
    crossTeamTask: "Nearby cross-team task",
    view: "View",
    claiming: "Claiming...",
    accept: "Accept",
    yourGpsLocation: "Your GPS location",
    statuses: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
  hi: {
    selectorLabel: "डैशबोर्ड भाषा",
    badge: "कर्मी डैशबोर्ड",
    title: (zone) => `${zone} के पास फील्ड कार्य`,
    intro:
      "पास की शिकायतें स्वीकार करें, कार्य स्थिति अपडेट करें, GPS चेक-इन करें और एक मोबाइल-फर्स्ट वर्कस्पेस से सबूत अपलोड करें।",
    availability: {
      Available: "उपलब्ध",
      Busy: "व्यस्त",
      Offline: "ऑफलाइन",
      "On Field": "फील्ड पर",
    },
    updateNote: (name, action) => `${name} ने कार्य को ${action} मार्क किया।`,
    updateSuccess: (action, ticket) =>
      `${ticket} के लिए ${action} अपडेट भेजा गया। नागरिक और एडमिन इसे लाइव देखेंगे।`,
    updateFailed: "कर्मी अपडेट विफल हुआ।",
    nearbyTitle: "पास की शिकायतें",
    radiusLabel: "1 km प्राथमिकता क्षेत्र",
    noNearby: "आपके क्षेत्र में अभी कोई GPS-tagged शिकायत नहीं है।",
    emergencyTitle: "आपातकालीन अलर्ट",
    noEmergency: "इस कर्मी के पास कोई आपातकालीन शिकायत नहीं है।",
    assignedTitle: "असाइन शिकायतें",
    noAssigned: "स्वीकार किए गए कार्य यहां दिखेंगे।",
    selectedTask: "चयनित कार्य",
    slaCountdown: "SLA काउंटडाउन",
    navigation: "नेविगेशन",
    assignedWorker: "असाइन कर्मी",
    gpsCheckIn: "साइट पर GPS चेक-इन",
    sending: "भेजा जा रहा है...",
    uploadProof: "सबूत फोटो अपलोड करें",
    proofReady: (count) => `${count} सबूत फोटो Resolved अपडेट के लिए तैयार।`,
    emergency: "आपातकाल",
    kmAway: (distance) => `${distance} km दूर`,
    sla: "SLA",
    matchesDepartment: (department) => `${department} से मेल खाता है`,
    crossTeamTask: "पास का क्रॉस-टीम कार्य",
    view: "देखें",
    claiming: "क्लेम हो रहा है...",
    accept: "स्वीकार करें",
    yourGpsLocation: "आपकी GPS लोकेशन",
    statuses: {
      Received: "प्राप्त",
      Assigned: "असाइन",
      "In Progress": "काम जारी",
      Resolved: "हल",
    },
  },
  hinglish: {
    selectorLabel: "Dashboard language",
    badge: "Worker Dashboard",
    title: (zone) => `${zone} ke paas field tasks`,
    intro:
      "Nearby complaints accept karein, work status update karein, GPS check-in karein, aur proof upload karein.",
    availability: {
      Available: "Available",
      Busy: "Busy",
      Offline: "Offline",
      "On Field": "On Field",
    },
    updateNote: (name, action) => `${name} ne task ko ${action} mark kiya.`,
    updateSuccess: (action, ticket) =>
      `${ticket} ke liye ${action} update bhej diya. Citizens aur admins ise live dekhenge.`,
    updateFailed: "Worker update fail hua.",
    nearbyTitle: "Nearby complaints",
    radiusLabel: "1 km priority radius",
    noNearby: "Aapke radius mein abhi koi GPS-tagged complaint nahi hai.",
    emergencyTitle: "Emergency alerts",
    noEmergency: "Is worker ke paas koi emergency complaint nahi hai.",
    assignedTitle: "Assigned complaints",
    noAssigned: "Accepted tasks yahan appear honge.",
    selectedTask: "Selected task",
    slaCountdown: "SLA countdown",
    navigation: "Navigation",
    assignedWorker: "Assigned worker",
    gpsCheckIn: "Site par GPS Check-in",
    sending: "Bhej rahe hain...",
    uploadProof: "Proof images upload karein",
    proofReady: (count) =>
      `${count} proof image${count === 1 ? "" : "s"} Resolved update ke liye ready.`,
    emergency: "Emergency",
    kmAway: (distance) => `${distance} km door`,
    sla: "SLA",
    matchesDepartment: (department) => `${department} se match`,
    crossTeamTask: "Nearby cross-team task",
    view: "View",
    claiming: "Claim ho raha hai...",
    accept: "Accept",
    yourGpsLocation: "Aapki GPS location",
    statuses: {
      Received: "Received",
      Assigned: "Assigned",
      "In Progress": "In Progress",
      Resolved: "Resolved",
    },
  },
};

const departmentByCategory: Record<string, string[]> = {
  Electricity: ["Electricity"],
  Sanitation: ["Sanitation", "Garbage Collection"],
  "Road & Infrastructure": ["Road Maintenance"],
  "Water Supply": ["Water Supply"],
  "Public Amenities": ["Garbage Collection", "Sanitation", "Road Maintenance"],
  Encroachment: ["Road Maintenance"],
  "Fire & Emergency": ["Road Maintenance", "Water Supply", "Electricity"],
  "Noise Pollution": ["Sanitation"],
  "Public Safety": ["Road Maintenance"],
};

function toWorkerProfile(user: AuthUser): BhopalWorker {
  const datasetWorker = findWorkerById(user.workerId) ?? bhopalWorkers[0];

  return {
    ...datasetWorker,
    workerId: user.workerId || datasetWorker.workerId,
    name: user.name || datasetWorker.name,
  };
}

function distanceKm(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const radius = 6371;
  const dLat = ((second.lat - first.lat) * Math.PI) / 180;
  const dLng = ((second.lng - first.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((first.lat * Math.PI) / 180) *
      Math.cos((second.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCompatibleDepartments(category: string) {
  return departmentByCategory[category] ?? ["Sanitation", "Road Maintenance", "Electricity", "Water Supply"];
}

function getSlaText(complaint: ComplaintCardModel) {
  if (complaint.urgency === "Critical") return "30m";
  if (complaint.urgency === "High") return "4h";
  if (complaint.urgency === "Low") return "72h";
  return "24h";
}

function getIssueTone(complaint: ComplaintCardModel) {
  if (complaint.urgency === "Critical") return "#dc2626";
  if (complaint.urgency === "High") return "#ea580c";
  if (complaint.status === "Resolved") return "#64748b";
  return "#0f766e";
}

function getAvailabilityTone(status: Availability) {
  if (status === "Available") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Busy") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "On Field") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function WorkerDashboardPage({
  snapshot,
  isLoading,
  user,
  language,
  onLanguageChange,
}: WorkerDashboardPageProps) {
  const copy = workerCopy[language];
  const worker = useMemo(() => toWorkerProfile(user), [user]);
  const [availability, setAvailability] = useState<Availability>(
    worker.status === "BUSY" ? "Busy" : worker.status === "ON DUTY" ? "On Field" : "Available",
  );
  const [selectedTicket, setSelectedTicket] = useState("");
  const [proofImages, setProofImages] = useState<File[]>([]);
  const [busyTicket, setBusyTicket] = useState("");
  const [message, setMessage] = useState("");

  const complaints = snapshot?.complaints ?? [];
  const withDistance = useMemo(
    () =>
      complaints
        .filter((complaint) => complaint.coordinates)
        .map((complaint) => ({
          ...complaint,
          distance: distanceKm(
            { lat: worker.lat, lng: worker.lng },
            complaint.coordinates!,
          ),
          compatible: getCompatibleDepartments(complaint.category).includes(worker.department),
        }))
        .sort((first, second) => first.distance - second.distance),
    [complaints, worker.department, worker.lat, worker.lng],
  );

  const nearbyComplaints = withDistance.filter((complaint) => complaint.distance <= 1 || complaint.compatible).slice(0, 8);
  const assignedComplaints = complaints.filter(
    (complaint) =>
      complaint.assignedWorker?.workerId === worker.workerId ||
      (complaint.assignedDepartment === worker.department &&
        ["Assigned", "In Progress"].includes(complaint.status)),
  );
  const emergencyComplaints = withDistance.filter(
    (complaint) => complaint.urgency === "Critical" || complaint.urgency === "High",
  ).slice(0, 3);
  const selectedComplaint =
    complaints.find((complaint) => (complaint.ticketId || complaint.id) === selectedTicket) ||
    nearbyComplaints[0] ||
    assignedComplaints[0];

  useEffect(() => {
    if (!selectedTicket && selectedComplaint) {
      setSelectedTicket(selectedComplaint.ticketId || selectedComplaint.id);
    }
  }, [selectedComplaint, selectedTicket]);

  async function runWorkerUpdate(
    complaint: ComplaintCardModel,
    workerAction: string,
    status = "In Progress",
  ) {
    const ticket = complaint.ticketId || complaint.id;
    setBusyTicket(`${ticket}-${workerAction}`);
    setMessage("");

    try {
      await updateComplaintWithProof(ticket, {
        status,
        action: workerAction,
        note: copy.updateNote(worker.name, workerAction),
        workerAction,
        workerStatus: workerAction,
        workerLat: worker.lat,
        workerLng: worker.lng,
        images: workerAction === "Resolved" ? proofImages : [],
      });
      setAvailability(status === "Resolved" ? "Available" : "On Field");
      setProofImages([]);
      setMessage(copy.updateSuccess(workerAction, ticket));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.updateFailed);
    } finally {
      setBusyTicket("");
    }
  }

  function handleProofSelection(event: ChangeEvent<HTMLInputElement>) {
    setProofImages(Array.from(event.target.files || []).slice(0, 5));
    event.target.value = "";
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
    <section className="grid gap-5">
      <div className="glass-panel shine-sweep animate-rise rounded-2xl p-5 shadow-premium sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusBadge tone="neutral">
              <Wrench size={14} />
              {copy.badge}
            </StatusBadge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">
              {copy.title(worker.zone)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">
              {copy.intro}
            </p>
          </div>

          <div className="grid gap-2 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
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
              <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-teal-700 to-blue-600 text-sm font-black text-white">
                {worker.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </span>
              <div>
                <strong className="block text-sm text-ink">{worker.name}</strong>
                <span className="text-xs font-bold text-muted">{worker.role} · {worker.workerId}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["Available", "Busy", "Offline", "On Field"] as Availability[]).map((status) => (
                <button
                  key={status}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[11px] font-black uppercase ring-1 transition",
                    availability === status
                      ? getAvailabilityTone(status)
                      : "bg-slate-50 text-slate-500 ring-slate-100 hover:bg-white",
                  )}
                  type="button"
                  onClick={() => setAvailability(status)}
                >
                  {copy.availability[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <WorkerMap
            worker={worker}
            complaints={withDistance}
            selectedTicket={selectedComplaint?.ticketId || selectedComplaint?.id}
            onSelect={(ticket) => setSelectedTicket(ticket)}
            language={language}
          />

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-ink">{copy.nearbyTitle}</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted ring-1 ring-line">
                {copy.radiusLabel}
              </span>
            </div>
            {nearbyComplaints.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {nearbyComplaints.map((complaint) => (
                  <WorkerComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    worker={worker}
                    busyTicket={busyTicket}
                    onSelect={() => setSelectedTicket(complaint.ticketId || complaint.id)}
                    onAccept={() => runWorkerUpdate(complaint, "Accepted", "Assigned")}
                    language={language}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-white p-5 text-sm font-semibold text-muted">
                {copy.noNearby}
              </div>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <EmergencyPanel complaints={emergencyComplaints} language={language} />
          {selectedComplaint ? (
            <WorkerTaskPanel
              complaint={selectedComplaint}
              worker={worker}
              proofImages={proofImages}
              busyTicket={busyTicket}
              message={message}
              onProofSelection={handleProofSelection}
              onUpdate={runWorkerUpdate}
              language={language}
            />
          ) : null}
          <AssignedPanel
            complaints={assignedComplaints}
            onSelect={(ticket) => setSelectedTicket(ticket)}
            language={language}
          />
        </aside>
      </div>
    </section>
  );
}

function WorkerMap({
  worker,
  complaints,
  selectedTicket,
  onSelect,
  language,
}: {
  worker: BhopalWorker;
  complaints: Array<ComplaintCardModel & { distance: number; compatible: boolean }>;
  selectedTicket?: string;
  onSelect: (ticket: string) => void;
  language: DashboardLanguage;
}) {
  const copy = workerCopy[language];
  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
      <div className="h-[440px]">
        <MapContainer center={[worker.lat, worker.lng]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={[worker.lat, worker.lng]}
            pathOptions={{ color: "#0f766e", fillColor: "#0f766e", fillOpacity: 0.85, weight: 3 }}
            radius={14}
          >
            <Popup>
              <strong>{worker.name}</strong>
              <p>{worker.role}</p>
              <p>{worker.zone}</p>
            </Popup>
            <Tooltip direction="top">{copy.yourGpsLocation}</Tooltip>
          </CircleMarker>
          <CircleMarker
            center={[worker.lat, worker.lng]}
            pathOptions={{ color: "#14b8a6", fillOpacity: 0.04, weight: 1, dashArray: "6 6" }}
            radius={42}
          />
          {complaints.map((complaint) => {
            const ticket = complaint.ticketId || complaint.id;
            const color = getIssueTone(complaint);
            return (
              <CircleMarker
                key={complaint.id}
                center={[complaint.coordinates!.lat, complaint.coordinates!.lng]}
                eventHandlers={{ click: () => onSelect(ticket) }}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: selectedTicket === ticket ? 0.9 : 0.55,
                  weight: selectedTicket === ticket ? 4 : 2,
                }}
                radius={complaint.urgency === "Critical" ? 16 : 11}
              >
                <Popup>
                  <strong>{ticket}</strong>
                  <p>{complaint.category}</p>
                  <p>{copy.kmAway(complaint.distance.toFixed(2))}</p>
                </Popup>
                <Tooltip direction="top">{complaint.category}</Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}

function WorkerComplaintCard({
  complaint,
  worker,
  busyTicket,
  onSelect,
  onAccept,
  language,
}: {
  complaint: ComplaintCardModel & { distance: number; compatible: boolean };
  worker: BhopalWorker;
  busyTicket: string;
  onSelect: () => void;
  onAccept: () => void;
  language: DashboardLanguage;
}) {
  const copy = workerCopy[language];
  const ticket = complaint.ticketId || complaint.id;
  const isBusy = busyTicket === `${ticket}-Accepted`;
  return (
    <article className="rounded-xl border border-white/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={complaint.urgency === "Critical" ? "critical" : complaint.urgency === "High" ? "high" : "info"}>
          {complaint.urgency === "Critical" ? copy.emergency : complaint.urgency}
        </StatusBadge>
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-muted">
          <MapPin size={14} />
          {complaint.distance.toFixed(2)} km
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black leading-tight text-ink">{complaint.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted">{complaint.summary}</p>
      <div className="mt-3 grid gap-2 text-xs font-bold text-muted">
        <span>{ticket}</span>
        <span>{complaint.category} · {copy.sla} {getSlaText(complaint)}</span>
        <span>{complaint.compatible ? copy.matchesDepartment(worker.department) : copy.crossTeamTask}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="min-h-10 rounded-lg border border-line bg-slate-50 text-xs font-black text-ink" type="button" onClick={onSelect}>
          {copy.view}
        </button>
        <button className="min-h-10 rounded-lg bg-teal-700 text-xs font-black text-white disabled:opacity-60" type="button" onClick={onAccept} disabled={isBusy}>
          {isBusy ? copy.claiming : copy.accept}
        </button>
      </div>
    </article>
  );
}

function WorkerTaskPanel({
  complaint,
  worker,
  proofImages,
  busyTicket,
  message,
  onProofSelection,
  onUpdate,
  language,
}: {
  complaint: ComplaintCardModel;
  worker: BhopalWorker;
  proofImages: File[];
  busyTicket: string;
  message: string;
  onProofSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdate: (complaint: ComplaintCardModel, workerAction: string, status?: string) => void;
  language: DashboardLanguage;
}) {
  const copy = workerCopy[language];
  const ticket = complaint.ticketId || complaint.id;
  return (
    <section className="rounded-xl border border-white/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase text-teal-700">{copy.selectedTask}</span>
          <h2 className="mt-1 text-2xl font-black text-ink">{complaint.title}</h2>
        </div>
        <StatusBadge tone={complaint.status === "Resolved" ? "success" : "info"}>
          {copy.statuses[complaint.status] ?? complaint.status}
        </StatusBadge>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-muted">{complaint.summary}</p>

      <div className="mt-4 grid gap-2 rounded-lg border border-line bg-slate-50 p-3 text-sm font-bold text-muted">
        <span className="inline-flex items-center gap-2"><TimerReset size={15} /> {copy.slaCountdown}: {getSlaText(complaint)}</span>
        <span className="inline-flex items-center gap-2"><Route size={15} /> {copy.navigation}: {complaint.location}</span>
        <span className="inline-flex items-center gap-2"><UserCheck size={15} /> {copy.assignedWorker}: {complaint.assignedWorker?.name || worker.name}</span>
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
        type="button"
        onClick={() => onUpdate(complaint, "GPS Check-in", "In Progress")}
      >
        <Crosshair size={17} />
        {copy.gpsCheckIn}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {workerStatuses.map((item) => {
          const isBusy = busyTicket === `${ticket}-${item.action}`;
          return (
            <button
              key={item.action}
              className={cn(
                "min-h-11 rounded-lg px-3 text-xs font-black transition disabled:opacity-60",
                item.status === "Resolved"
                  ? "bg-emerald-700 text-white"
                  : "border border-line bg-white text-ink hover:bg-slate-50",
              )}
              type="button"
              onClick={() => onUpdate(complaint, item.action, item.status)}
              disabled={isBusy}
            >
              {isBusy ? copy.sending : item.labels[language]}
            </button>
          );
        })}
      </div>

      <label className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-slate-50 px-4 text-sm font-black text-ink transition hover:bg-white">
        <ImagePlus size={17} />
        {copy.uploadProof}
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onProofSelection} />
      </label>
      {proofImages.length ? (
        <p className="mt-2 text-xs font-bold text-muted">{copy.proofReady(proofImages.length)}</p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-bold leading-5 text-teal-900">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function EmergencyPanel({
  complaints,
  language,
}: {
  complaints: Array<ComplaintCardModel & { distance: number }>;
  language: DashboardLanguage;
}) {
  const copy = workerCopy[language];
  return (
    <section className="rounded-xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={20} className="text-rose-600" />
        <h2 className="text-xl font-black text-ink">{copy.emergencyTitle}</h2>
      </div>
      <div className="grid gap-3">
        {complaints.length ? complaints.map((complaint) => (
          <article key={complaint.id} className="rounded-lg bg-rose-50 p-3 text-rose-900 ring-1 ring-rose-100">
            <strong className="block text-sm">{complaint.title}</strong>
            <span className="mt-1 block text-xs font-bold">{complaint.distance.toFixed(2)} km · {complaint.category}</span>
          </article>
        )) : (
          <p className="rounded-lg border border-dashed border-line p-3 text-sm font-semibold text-muted">{copy.noEmergency}</p>
        )}
      </div>
    </section>
  );
}

function AssignedPanel({
  complaints,
  onSelect,
  language,
}: {
  complaints: ComplaintCardModel[];
  onSelect: (ticket: string) => void;
  language: DashboardLanguage;
}) {
  const copy = workerCopy[language];
  return (
    <section className="rounded-xl border border-white/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UploadCloud size={20} className="text-teal-700" />
        <h2 className="text-xl font-black text-ink">{copy.assignedTitle}</h2>
      </div>
      <div className="grid gap-2">
        {complaints.length ? complaints.map((complaint) => (
          <button
            key={complaint.id}
            className="rounded-lg border border-line bg-slate-50 p-3 text-left transition hover:bg-white"
            type="button"
            onClick={() => onSelect(complaint.ticketId || complaint.id)}
          >
            <strong className="block text-sm text-ink">{complaint.title}</strong>
            <span className="mt-1 block text-xs font-bold text-muted">
              {complaint.ticketId} · {copy.statuses[complaint.status] ?? complaint.status}
            </span>
          </button>
        )) : (
          <p className="rounded-lg border border-dashed border-line p-3 text-sm font-semibold text-muted">{copy.noAssigned}</p>
        )}
      </div>
    </section>
  );
}
