import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-line bg-white/90 px-6 py-14 text-center shadow-sm">
      <span className="mx-auto grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
        {icon}
      </span>
      <h2 className="mt-4 text-2xl font-black text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
        {description}
      </p>
    </section>
  );
}
