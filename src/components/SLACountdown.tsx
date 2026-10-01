import { TimerReset } from "lucide-react";
import useSLATimer from "../hooks/useSLATimer";
import { getSlaHoursForUrgency, getSlaRuleForUrgency } from "../utils/slaRules";

interface SLACountdownProps {
  createdAt: string;
  urgency: string;
}

export function SLACountdown({ createdAt, urgency }: SLACountdownProps) {
  const slaHours = getSlaHoursForUrgency(urgency);
  const rule = getSlaRuleForUrgency(urgency);
  const sla = useSLATimer(createdAt, slaHours);

  return (
    <div className="rounded-lg border border-line bg-white/85 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-black uppercase text-slate-500">
          <TimerReset size={15} />
          SLA response
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-black"
          style={{
            color: sla.color,
            backgroundColor: sla.isBreached ? "rgba(220, 38, 38, 0.08)" : "rgba(22, 163, 74, 0.08)",
          }}
        >
          {sla.statusText}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="text-sm text-ink">{sla.timeRemaining}</strong>
        <span className="text-xs font-semibold text-muted">
          {rule.label} priority
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-muted">
        {rule.response}; {rule.resolution}
      </p>
    </div>
  );
}
