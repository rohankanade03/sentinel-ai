import type { ReactNode } from "react";
import type { AuthUser } from "../api/authApi";
import { HelpChatbot } from "./HelpChatbot";
import { Sidebar } from "./Sidebar";
import type { SidebarNavItem } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  activeView?: string;
  navItems?: SidebarNavItem[];
  user?: AuthUser | null;
  onLogout?: () => void;
}

export function DashboardLayout({
  children,
  activeView,
  navItems,
  user,
  onLogout,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar
        activeView={activeView}
        navItems={navItems}
        user={user}
        onLogout={onLogout}
      />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
      <HelpChatbot />
    </div>
  );
}
