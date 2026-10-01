import {
  ClipboardList,
  Flame,
  History,
  KeyRound,
  LogOut,
  Map,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AuthUser } from "../api/authApi";
import { cn } from "../utils/cn";

export interface SidebarNavItem {
  label: string;
  view: string;
  href: string;
  icon: LucideIcon;
}

export const defaultNavItems: SidebarNavItem[] = [
  { label: "User Dashboard", view: "user-dashboard", href: "#user-dashboard", icon: UserRound },
  { label: "Login / Auth", view: "auth", href: "#auth", icon: KeyRound },
  { label: "Admin Dashboard", view: "admin-dashboard", href: "#admin-dashboard", icon: ShieldCheck },
  { label: "Complaints", view: "complaints", href: "#complaints", icon: ClipboardList },
  { label: "Heatmap", view: "heatmap", href: "#heatmap", icon: Map },
  { label: "Trend spikes", view: "trend-spikes", href: "#trend-spikes", icon: Flame },
  { label: "Audit log", view: "audit-log", href: "#audit-log", icon: History },
  { label: "Settings", view: "settings", href: "#settings", icon: Settings },
];

interface SidebarProps {
  activeView?: string;
  navItems?: SidebarNavItem[];
  user?: AuthUser | null;
  onLogout?: () => void;
}

export function Sidebar({
  activeView = "user-dashboard",
  navItems = defaultNavItems,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className="sticky top-0 hidden h-screen border-r border-line bg-white/80 px-4 py-6 backdrop-blur-xl lg:grid lg:grid-rows-[auto_1fr_auto]"
      aria-label="Primary navigation"
    >
      <a className="flex items-center gap-3" href="/" aria-label="Sentinel AI home">
        <span className="grid size-11 place-items-center rounded-lg bg-gradient-to-br from-teal-700 via-blue-600 to-violet-600 font-black text-white shadow-lg shadow-blue-200">
          S
        </span>
        <span>
      <strong className="block text-sm font-black text-ink">Sentinel AI</strong>
          <small className="mt-1 block text-xs text-muted">Civic intelligence</small>
        </span>
      </a>

      <nav className="mt-8 grid content-start gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.view === activeView;

          return (
            <a
              key={item.label}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted transition hover:translate-x-0.5 hover:bg-slate-50 hover:text-ink",
                isActive && "bg-slate-50 text-ink ring-1 ring-line",
              )}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-3 border-t border-line pt-4">
        {user ? (
          <div className="rounded-lg border border-line bg-slate-50 p-3">
            <span className="text-[11px] font-black uppercase text-teal-700">
              Signed in
            </span>
            <strong className="mt-1 block truncate text-sm text-ink">
              {user.name}
            </strong>
            <span className="mt-1 block truncate text-xs font-semibold text-muted">
              {user.role}
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-slate-50 p-3">
            <span className="text-[11px] font-black uppercase text-blue-700">
              Unified access
            </span>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              Login or signup to open role-based modules.
            </p>
          </div>
        )}

        {user && onLogout ? (
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            type="button"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        ) : null}
      </div>
    </aside>
  );
}
