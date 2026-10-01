import { ArrowUpRight } from "lucide-react";
import type { DashboardStat } from "../types/dashboard";
import { cn } from "../utils/cn";

const toneClass: Record<DashboardStat["tone"], string> = {
  teal: "from-teal-50 to-white after:bg-teal-600",
  emerald: "from-emerald-50 to-white after:bg-emerald-600",
  amber: "from-amber-50 to-white after:bg-amber-500",
  rose: "from-rose-50 to-white after:bg-rose-600",
};

interface StatCardProps {
  stat: DashboardStat;
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <article
      className={cn(
        "animate-rise relative min-h-36 overflow-hidden rounded-xl border border-white/70 bg-gradient-to-b p-5 shadow-sm transition duration-300 after:absolute after:bottom-4 after:right-4 after:h-1.5 after:w-14 after:rounded-full hover:-translate-y-1 hover:shadow-lift",
        toneClass[stat.tone],
      )}
    >
      <div>
        <span className="text-sm font-medium text-muted">{stat.label}</span>
        <strong className="mt-2 block text-3xl font-black text-ink sm:text-4xl">
          {stat.value}
        </strong>
      </div>
      <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowUpRight size={15} />
        {stat.delta}
      </p>
    </article>
  );
}
