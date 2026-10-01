import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface PlaceholderPanelProps {
  icon: ReactNode;
  title: string;
  items: string[];
}

export function PlaceholderPanel({ icon, title, items }: PlaceholderPanelProps) {
  return (
    <section className="animate-rise shine-sweep rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100/70 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative z-10 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-gradient-to-br from-teal-50 to-blue-50 text-teal-700 shadow-inner">
          {icon}
        </span>
        <h2 className="text-base font-black text-ink">{title}</h2>
      </div>

      <ul className="relative z-10 mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-muted">
            <CheckCircle2 size={15} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
