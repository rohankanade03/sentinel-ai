import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ClipboardList,
  Flame,
  HeartHandshake,
  KeyRound,
  LayoutGrid,
  Map,
  Search,
  ShieldAlert,
  ShieldCheck,
  Settings,
  UserRound,
  Wrench,
  Waves,
} from "lucide-react";
import { getCurrentUser, logout, type AuthUser } from "../api/authApi";
import { ComplaintCard } from "../components/ComplaintCard";
import ComplaintHeatmap from "../components/ComplaintHeatmap";
import { DashboardLayout } from "../components/DashboardLayout";
import { EmptyState } from "../components/EmptyState";
import { FilterBar } from "../components/FilterBar";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import type { SidebarNavItem } from "../components/Sidebar";
import { StatusBadge } from "../components/StatusBadge";
import { useDashboardSnapshot } from "../hooks/useDashboardSnapshot";
import { AdminDashboard } from "./AdminDashboard";
import { AuditLogPage } from "./AuditLogPage";
import { AuthPage } from "./AuthPage";
import { MyComplaintsPage } from "./MyComplaintsPage";
import { CommunityImpactPage } from "./CommunityImpactPage";
import { WorkerDashboardPage } from "./WorkerDashboardPage";
import { SettingsPage } from "./SettingsPage";
import { TrendSpikesPage } from "./TrendSpikesPage";
import { UserDashboard } from "./UserDashboard";
import type {
  ComplaintCardModel,
  DashboardLanguage,
  DashboardFilters,
  DashboardSnapshot,
} from "../types/dashboard";
import { dashboardLanguages } from "../types/dashboard";

type DashboardView =
  | "user-dashboard"
  | "auth"
  | "my-complaints"
  | "community-impact"
  | "worker-dashboard"
  | "admin-dashboard"
  | "complaints"
  | "heatmap"
  | "trend-spikes"
  | "audit-log"
  | "settings";

const navCopy: Record<
  DashboardLanguage,
  {
    userDashboard: string;
    myComplaints: string;
    communityImpact: string;
    workerDashboard: string;
    settings: string;
  }
> = {
  en: {
    userDashboard: "User Dashboard",
    myComplaints: "My Complaints",
    communityImpact: "Community Impact",
    workerDashboard: "Worker Dashboard",
    settings: "Settings",
  },
  hi: {
    userDashboard: "उपयोगकर्ता डैशबोर्ड",
    myComplaints: "मेरी शिकायतें",
    communityImpact: "सामुदायिक प्रभाव",
    workerDashboard: "कर्मी डैशबोर्ड",
    settings: "सेटिंग्स",
  },
  hinglish: {
    userDashboard: "User Dashboard",
    myComplaints: "Meri Complaints",
    communityImpact: "Community Impact",
    workerDashboard: "Worker Dashboard",
    settings: "Settings",
  },
};

const fallbackFilters = {
  categories: [{ label: "All categories", value: "all" }],
  statuses: [{ label: "All status", value: "all" as const }],
};

const viewTitles: Record<DashboardView, string> = {
  "user-dashboard": "User Dashboard",
  auth: "Login / Auth",
  "my-complaints": "My Complaints",
  "community-impact": "Community Impact",
  "worker-dashboard": "Worker Dashboard",
  "admin-dashboard": "Admin Dashboard",
  complaints: "Complaints & Audit",
  heatmap: "Heatmap",
  "trend-spikes": "Trend spikes",
  "audit-log": "Complaints & Audit",
  settings: "Settings",
};

const allViews: DashboardView[] = [
  "user-dashboard",
  "auth",
  "my-complaints",
  "community-impact",
  "worker-dashboard",
  "admin-dashboard",
  "complaints",
  "heatmap",
  "trend-spikes",
  "audit-log",
  "settings",
];

const guestNavItems: SidebarNavItem[] = [
  { label: "Login / Signup", view: "auth", href: "#auth", icon: KeyRound },
];

const adminNavItems: SidebarNavItem[] = [
  { label: "Admin Dashboard", view: "admin-dashboard", href: "#admin-dashboard", icon: ShieldCheck },
  { label: "Complaints & Audit", view: "complaints", href: "#complaints", icon: ClipboardList },
  { label: "Heatmap", view: "heatmap", href: "#heatmap", icon: Map },
  { label: "Trend spikes", view: "trend-spikes", href: "#trend-spikes", icon: Flame },
  { label: "Settings", view: "settings", href: "#settings", icon: Settings },
];

function getViewFromHash(): DashboardView {
  const hash = window.location.hash.replace("#", "");

  return allViews.includes(hash as DashboardView)
    ? (hash as DashboardView)
    : "auth";
}

function getDefaultViewForUser(user: AuthUser): DashboardView {
  if (user.role === "worker") return "worker-dashboard";
  return user.role === "admin" ? "admin-dashboard" : "user-dashboard";
}

function getLocalizedUserNavItems(language: DashboardLanguage): SidebarNavItem[] {
  const copy = navCopy[language];

  return [
    { label: copy.userDashboard, view: "user-dashboard", href: "#user-dashboard", icon: UserRound },
    { label: copy.myComplaints, view: "my-complaints", href: "#my-complaints", icon: ClipboardList },
    { label: copy.communityImpact, view: "community-impact", href: "#community-impact", icon: HeartHandshake },
    { label: copy.settings, view: "settings", href: "#settings", icon: Settings },
  ];
}

function getLocalizedWorkerNavItems(language: DashboardLanguage): SidebarNavItem[] {
  const copy = navCopy[language];

  return [
    { label: copy.workerDashboard, view: "worker-dashboard", href: "#worker-dashboard", icon: Wrench },
    { label: copy.settings, view: "settings", href: "#settings", icon: Settings },
  ];
}

function getInitialDashboardLanguage(): DashboardLanguage {
  const savedLanguage = window.localStorage.getItem("civicflow-dashboard-language");

  return dashboardLanguages.some((language) => language.value === savedLanguage)
    ? (savedLanguage as DashboardLanguage)
    : "en";
}

function getNavItemsForUser(
  user: AuthUser | null,
  language: DashboardLanguage,
): SidebarNavItem[] {
  if (!user) {
    return guestNavItems;
  }

  if (user.role === "admin") return adminNavItems;
  if (user.role === "worker") return getLocalizedWorkerNavItems(language);
  return getLocalizedUserNavItems(language);
}

function canAccessView(
  view: DashboardView,
  user: AuthUser | null,
  language: DashboardLanguage,
) {
  if (!user) {
    return view === "auth";
  }

  return getNavItemsForUser(user, language).some((item) => item.view === view);
}

function resolveViewForUser(
  view: DashboardView,
  user: AuthUser | null,
  language: DashboardLanguage,
) {
  if (!user) {
    return "auth";
  }

  if (user.role === "admin" && view === "audit-log") {
    return "complaints";
  }

  return canAccessView(view, user, language) ? view : getDefaultViewForUser(user);
}

function replaceHash(view: DashboardView) {
  const nextHash = `#${view}`;

  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

export function DashboardPage() {
  const { data: snapshot, isLoading, error } = useDashboardSnapshot();
  const [activeView, setActiveView] = useState<DashboardView>(getViewFromHash);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [dashboardLanguage, setDashboardLanguage] = useState<DashboardLanguage>(
    getInitialDashboardLanguage,
  );
  const [savedComplaints, setSavedComplaints] = useState<ComplaintCardModel[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    query: "",
    category: "all",
    status: "all",
  });

  useEffect(() => {
    const handleHashChange = () => setActiveView(getViewFromHash());

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((user) => {
        if (isMounted) {
          setAuthUser(user);
        }
      })
      .catch(() => {
        if (isMounted) setAuthUser(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthChecking) {
      return;
    }

    const nextView = resolveViewForUser(activeView, authUser, dashboardLanguage);

    if (nextView !== activeView) {
      replaceHash(nextView);
      setActiveView(nextView);
    }
  }, [activeView, authUser, dashboardLanguage, isAuthChecking]);

  const activeSnapshot = useMemo<DashboardSnapshot | null>(() => {
    if (!snapshot) {
      return null;
    }

    const seenTickets = new Set<string>();
    const complaints = [...savedComplaints, ...snapshot.complaints].filter(
      (complaint) => {
        const key = (complaint.ticketId ?? complaint.id).toLowerCase();

        if (seenTickets.has(key)) {
          return false;
        }

        seenTickets.add(key);
        return true;
      },
    );

    return {
      ...snapshot,
      complaints,
      stats: snapshot.stats.map((stat) => {
        if (stat.id === "total-complaints") {
          return { ...stat, value: String(complaints.length) };
        }

        if (stat.id === "open-complaints") {
          return {
            ...stat,
            value: String(
              complaints.filter((complaint) => complaint.status !== "Resolved").length,
            ),
          };
        }

        if (stat.id === "critical-flags") {
          return {
            ...stat,
            value: String(
              complaints.filter((complaint) => complaint.urgency === "Critical").length,
            ),
          };
        }

        return stat;
      }),
      statuses: snapshot.statuses.map((status) => ({
        ...status,
        count: complaints.filter((complaint) => complaint.status === status.id).length,
      })),
    };
  }, [savedComplaints, snapshot]);

  function handleComplaintSaved(complaint: ComplaintCardModel) {
    setSavedComplaints((current) => {
      const nextKey = (complaint.ticketId ?? complaint.id).toLowerCase();
      return [
        complaint,
        ...current.filter(
          (existing) => (existing.ticketId ?? existing.id).toLowerCase() !== nextKey,
        ),
      ];
    });
  }

  const handleAuthChange = useCallback((user: AuthUser | null) => {
    setAuthUser(user);
    setIsAuthChecking(false);

    const nextView = user ? getDefaultViewForUser(user) : "auth";
    replaceHash(nextView);
    setActiveView(nextView);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setAuthUser(null);
      setSavedComplaints([]);
      replaceHash("auth");
      setActiveView("auth");
    }
  }, []);

  const filteredComplaints = useMemo(() => {
    if (!activeSnapshot) {
      return [];
    }

    const normalizedQuery = filters.query.trim().toLowerCase();

    return activeSnapshot.complaints.filter((complaint) => {
      const searchableText = [
        complaint.title,
        complaint.summary,
        complaint.location,
        complaint.category,
        complaint.status,
        complaint.urgency,
        complaint.ticketId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesCategory =
        filters.category === "all" ||
        complaint.category.toLowerCase().replace(/\s+/g, "-") === filters.category;
      const matchesStatus =
        filters.status === "all" || complaint.status === filters.status;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [activeSnapshot, filters]);

  const filterBar = (
    <FilterBar
      filters={filters}
      categories={activeSnapshot?.categories ?? fallbackFilters.categories}
      statuses={activeSnapshot?.statusFilters ?? fallbackFilters.statuses}
      onFiltersChange={setFilters}
    />
  );
  const handleLanguageChange = useCallback((language: DashboardLanguage) => {
    window.localStorage.setItem("civicflow-dashboard-language", language);
    setDashboardLanguage(language);
  }, []);
  const navItems = useMemo(
    () => getNavItemsForUser(authUser, dashboardLanguage),
    [authUser, dashboardLanguage],
  );
  const shouldBlockProtectedView =
    activeView !== "auth" &&
    (isAuthChecking || !authUser || !canAccessView(activeView, authUser, dashboardLanguage));

  return (
    <DashboardLayout
      activeView={activeView}
      navItems={navItems}
      user={authUser}
      onLogout={authUser ? handleLogout : undefined}
    >
      <div className="mb-5 flex items-center gap-3 lg:hidden">
        <span className="grid size-11 place-items-center rounded-lg bg-gradient-to-br from-teal-700 via-blue-600 to-violet-600 font-black text-white shadow-lg shadow-blue-200">
          S
        </span>
        <div>
          <strong className="block text-sm font-black text-ink">Sentinel AI</strong>
          <span className="text-xs font-semibold text-muted">
            {viewTitles[activeView]}
          </span>
        </div>
      </div>

      <nav
        className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden"
        aria-label="Dashboard sections"
      >
        {navItems.map((item) => {
          const isActive = item.view === activeView;

          return (
            <a
              key={item.view}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-black transition ${
                isActive
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-line bg-white text-muted"
              }`}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label.replace(" Dashboard", "").replace(" / Signup", "")}
            </a>
          );
        })}
      </nav>

      {shouldBlockProtectedView ? (
        <AccessRedirect
          isChecking={isAuthChecking}
          user={authUser}
        />
      ) : null}

      {activeView === "user-dashboard" && !shouldBlockProtectedView ? (
        <UserDashboard
          snapshot={activeSnapshot}
          isLoading={isLoading}
          onComplaintSaved={handleComplaintSaved}
          language={dashboardLanguage}
          onLanguageChange={handleLanguageChange}
        />
      ) : null}

      {activeView === "auth" ? <AuthPage onAuthChange={handleAuthChange} /> : null}

      {activeView === "my-complaints" && !shouldBlockProtectedView ? (
        <MyComplaintsPage
          activeComplaint={savedComplaints[0] ?? null}
          isLoading={isAuthChecking}
        />
      ) : null}

      {activeView === "community-impact" && !shouldBlockProtectedView ? (
        <CommunityImpactPage snapshot={activeSnapshot} isLoading={isLoading} />
      ) : null}

      {activeView === "worker-dashboard" && !shouldBlockProtectedView && authUser ? (
        <WorkerDashboardPage
          snapshot={activeSnapshot}
          isLoading={isLoading}
          user={authUser}
          language={dashboardLanguage}
          onLanguageChange={handleLanguageChange}
        />
      ) : null}

      {activeView === "admin-dashboard" && !shouldBlockProtectedView ? (
        authUser?.role === "admin" ? (
          <AdminDashboard snapshot={activeSnapshot} isLoading={isLoading} error={error} />
        ) : (
          <AccessWarning
            isChecking={isAuthChecking}
            user={authUser}
          />
        )
      ) : null}

      {activeView === "complaints" && !shouldBlockProtectedView ? (
        <ViewShell title="Complaints & Audit" badge="Operations">
          {filterBar}
          <div className="mt-6">
            <ComplaintBoard
              error={error}
              isLoading={isLoading}
              complaints={filteredComplaints}
            />
          </div>
          <AuditLogPage
            snapshot={activeSnapshot}
            isLoading={isLoading}
            variant="embedded"
          />
        </ViewShell>
      ) : null}

      {activeView === "heatmap" && !shouldBlockProtectedView ? (
        <ViewShell title="Heatmap" badge="Location intelligence">
          <ComplaintHeatmap
            complaints={activeSnapshot?.complaints ?? []}
            isLoading={isLoading}
          />
        </ViewShell>
      ) : null}

      {activeView === "trend-spikes" && !shouldBlockProtectedView ? (
        <TrendSpikesPage snapshot={activeSnapshot} isLoading={isLoading} />
      ) : null}

      {activeView === "settings" && !shouldBlockProtectedView ? (
        <SettingsPage snapshot={activeSnapshot} isLoading={isLoading} error={error} />
      ) : null}
    </DashboardLayout>
  );
}

interface AccessRedirectProps {
  isChecking: boolean;
  user: AuthUser | null;
}

function AccessRedirect({ isChecking, user }: AccessRedirectProps) {
  return (
    <ViewShell
      title={isChecking ? "Checking access" : "Redirecting"}
      badge={isChecking ? "Session" : "Role-based access"}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {isChecking ? (
          <>
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm md:col-span-3">
            <h2 className="text-2xl font-black text-amber-950">
              This module is not available for your role.
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-900">
              {user
                ? "You are being returned to the dashboard modules available to your account."
                : "Please login or signup to continue."}
            </p>
          </div>
        )}
      </div>
    </ViewShell>
  );
}

interface AccessWarningProps {
  isChecking: boolean;
  user: AuthUser | null;
}

function AccessWarning({ isChecking, user }: AccessWarningProps) {
  if (isChecking) {
    return (
      <ViewShell title="Admin Dashboard" badge="Checking session">
        <div className="grid gap-4 md:grid-cols-3">
          <LoadingSkeleton variant="stat" />
          <LoadingSkeleton variant="stat" />
          <LoadingSkeleton variant="stat" />
        </div>
      </ViewShell>
    );
  }

  return (
    <ViewShell title="Admin Dashboard" badge="Restricted access">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
            <ShieldAlert size={24} />
          </span>
          <div>
            <h2 className="text-2xl font-black text-amber-950">
              Admin access is restricted.
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-amber-900">
              {user
                ? `You are signed in as ${user.role}. Citizen/User accounts can use the User Dashboard, My Complaints, and Community Impact, but cannot access the Admin Dashboard.`
                : "Please login with an Admin account. Admin signup requires the valid Admin Invite Code."}
            </p>
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-900 px-4 text-sm font-black text-white transition hover:-translate-y-0.5"
              href="#auth"
            >
              Go to Login / Auth
            </a>
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

interface ComplaintBoardProps {
  error: string | null;
  isLoading: boolean;
  complaints: ComplaintCardModel[];
}

function ComplaintBoard({ error, isLoading, complaints }: ComplaintBoardProps) {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <StatusBadge tone="neutral">
            <LayoutGrid size={14} />
            Masonry queue
          </StatusBadge>
          <h2 className="mt-3 text-2xl font-black text-ink sm:text-3xl">
            Live complaint board
          </h2>
        </div>
        <p className="text-sm font-semibold text-muted">
          {complaints.length} visible cards
        </p>
      </div>

      {error ? (
        <EmptyState
          icon={<Search size={24} />}
          title="Dashboard unavailable"
          description={error}
        />
      ) : isLoading ? (
        <div
          className="masonry-dashboard columns-1 md:columns-2 2xl:columns-3"
          aria-label="Loading complaint cards"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <LoadingSkeleton key={index} variant="complaint" />
          ))}
        </div>
      ) : complaints.length ? (
        <div className="masonry-dashboard columns-1 md:columns-2 2xl:columns-3">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search size={24} />}
          title="No matching complaints"
          description="The visual shell is ready for real search and backend filtering once the API contract lands."
        />
      )}
    </div>
  );
}

interface ViewShellProps {
  title: string;
  badge: string;
  children: ReactNode;
}

function ViewShell({ title, badge, children }: ViewShellProps) {
  return (
    <section className="grid gap-5">
      <div className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <Waves size={14} />
          {badge}
        </StatusBadge>
        <h1 className="mt-4 text-4xl font-black text-ink sm:text-5xl">{title}</h1>
      </div>
      {children}
    </section>
  );
}
