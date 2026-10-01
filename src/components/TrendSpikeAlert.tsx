import { useMemo, useState } from "react";
import { TrendingUp, X } from "lucide-react";
import type { ComplaintDataSource } from "../utils/complaintAdapters";
import { getTrendSpikeSignals } from "../utils/trendSpikes";

interface TrendSpikeAlertProps {
  complaints: ComplaintDataSource[];
}

export default function TrendSpikeAlert({ complaints }: TrendSpikeAlertProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const spikes = useMemo(() => getTrendSpikeSignals(complaints), [complaints]);
  const visibleSpikes = spikes.filter((spike) => !dismissed.includes(spike.id));

  if (!visibleSpikes.length) {
    return null;
  }

  return (
    <div className="mb-5 grid gap-3" aria-label="Trend spike alerts">
      {visibleSpikes.map((spike) => (
        <section
          key={spike.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-yellow-300 bg-[#fef08a] px-4 py-3 text-[#854d0e] shadow-lg shadow-yellow-100 sm:px-5"
          role="alert"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-yellow-200/70">
              <TrendingUp size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black">
                {"\u26A0\uFE0F"} Surge detected in {spike.sector} {"\u2014"}{" "}
                {spike.category} complaints spiking
              </p>
              <p className="mt-1 text-sm font-semibold">
                {spike.count}+ complaints detected within 2 hours ({spike.timeframe})
              </p>
            </div>
          </div>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-yellow-200/70 transition hover:bg-yellow-300"
            type="button"
            aria-label={`Dismiss trend spike in ${spike.sector}`}
            onClick={() => setDismissed((current) => [...current, spike.id])}
          >
            <X size={18} />
          </button>
        </section>
      ))}
    </div>
  );
}
