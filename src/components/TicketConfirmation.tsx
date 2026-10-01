import { CheckCircle2, FileText, Link2, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { CommunicationPreview, CommunicationStatus } from "../types/dashboard";
import type { DashboardLanguage } from "../types/dashboard";

interface TicketConfirmationProps {
  ticketId: string;
  complaintPreview: string;
  location: string;
  category: string;
  trackingUrl?: string;
  communication?: CommunicationPreview;
  language: DashboardLanguage;
}

const goodStatuses = new Set<CommunicationStatus>([
  "accepted",
  "answered",
  "completed",
  "delivered",
  "processing",
  "queued",
  "read",
  "sending",
  "sent",
]);

function statusTone(status?: CommunicationStatus) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-700";
  if (goodStatuses.has(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "retrying" || status === "no-answer" || status === "busy") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

const confirmationCopy: Record<
  DashboardLanguage,
  {
    generated: string;
    message: string;
    preview: string;
    category: string;
    location: string;
    call: string;
    whatsapp: string;
    sms: string;
    notAttempted: string;
    deliveryNote: string;
    trackingLink: string;
  }
> = {
  en: {
    generated: "Ticket generated",
    message:
      "Your complaint has been received by Sentinel AI. The civic team can use this ticket ID for future status updates and audit tracking.",
    preview: "Complaint preview",
    category: "Category",
    location: "Location",
    call: "Call",
    whatsapp: "WhatsApp",
    sms: "SMS",
    notAttempted: "not attempted yet",
    deliveryNote: "Delivery note",
    trackingLink: "Open tracking link",
  },
  hi: {
    generated: "टिकट बन गया",
    message:
      "आपकी शिकायत Sentinel AI को मिल गई है। नागरिक टीम आगे की स्थिति अपडेट और ऑडिट ट्रैकिंग के लिए इस टिकट ID का उपयोग कर सकती है।",
    preview: "शिकायत पूर्वावलोकन",
    category: "श्रेणी",
    location: "लोकेशन",
    call: "कॉल",
    whatsapp: "WhatsApp",
    sms: "SMS",
    notAttempted: "अभी प्रयास नहीं हुआ",
    deliveryNote: "डिलीवरी नोट",
    trackingLink: "ट्रैकिंग लिंक खोलें",
  },
  hinglish: {
    generated: "Ticket generate ho gaya",
    message:
      "Aapki complaint Sentinel AI ko receive ho gayi hai. Civic team future status updates aur audit tracking ke liye is ticket ID ka use kar sakti hai.",
    preview: "Complaint preview",
    category: "Category",
    location: "Location",
    call: "Call",
    whatsapp: "WhatsApp",
    sms: "SMS",
    notAttempted: "abhi attempt nahi hua",
    deliveryNote: "Delivery note",
    trackingLink: "Tracking link open karein",
  },
};

function formatStatus(status: CommunicationStatus | undefined, notAttempted: string) {
  return status ? status.replace("-", " ") : notAttempted;
}

function DeliveryStatus({
  icon,
  label,
  status,
  notAttempted,
}: {
  icon: ReactNode;
  label: string;
  status?: CommunicationStatus;
  notAttempted: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase ${statusTone(status)}`}>
      {icon}
      {label}: {formatStatus(status, notAttempted)}
    </span>
  );
}

export function TicketConfirmation({
  ticketId,
  complaintPreview,
  location,
  category,
  trackingUrl,
  communication,
  language,
}: TicketConfirmationProps) {
  const copy = confirmationCopy[language];
  const latestFailure = communication?.history?.find(
    (entry) => entry.status === "failed" || entry.status === "skipped" || entry.status === "undelivered",
  );

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
          <CheckCircle2 size={24} />
        </span>
        <div className="min-w-0">
          <span className="text-xs font-black uppercase text-emerald-700">
            {copy.generated}
          </span>
          <h2 className="mt-1 text-2xl font-black text-ink">{ticketId}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            {copy.message}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-200 bg-white/80 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-ink">
          <FileText size={16} />
          {copy.preview}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">{complaintPreview}</p>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-ink sm:grid-cols-2">
          <span>{copy.category}: {category}</span>
          <span>{copy.location}: {location}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <DeliveryStatus
          icon={<Phone size={15} />}
          label={copy.call}
          status={communication?.callStatus}
          notAttempted={copy.notAttempted}
        />
        <DeliveryStatus
          icon={<MessageCircle size={15} />}
          label={copy.whatsapp}
          status={communication?.whatsappStatus}
          notAttempted={copy.notAttempted}
        />
        <DeliveryStatus
          icon={<MessageCircle size={15} />}
          label={copy.sms}
          status={communication?.smsStatus}
          notAttempted={copy.notAttempted}
        />
      </div>

      {latestFailure?.lastError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
          {copy.deliveryNote}: {latestFailure.lastError}
        </p>
      ) : null}
      {trackingUrl ? (
        <a
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Link2 size={16} />
          {copy.trackingLink}
        </a>
      ) : null}
    </section>
  );
}
