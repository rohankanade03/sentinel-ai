import type { ReactNode } from "react";

interface HeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function Header({ eyebrow, title, description, actions }: HeaderProps) {
  return (
    <header className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium backdrop-blur sm:p-8 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8 lg:p-10">
      <div className="relative z-10 max-w-4xl">
        {eyebrow ? (
          <p className="text-xs font-black uppercase text-teal-700">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.98] text-ink sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 lg:mt-0 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
