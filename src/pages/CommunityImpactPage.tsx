import "leaflet/dist/leaflet.css";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Award,
  CalendarClock,
  Flame,
  Heart,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Navigation,
  Radio,
  Share2,
  ShieldAlert,
  Sparkles,
  Sprout,
  Star,
  TreePine,
  Users,
  Waves,
} from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import type { ComplaintCardModel, DashboardSnapshot } from "../types/dashboard";
import { normalizeComplaints, type NormalizedComplaint } from "../utils/complaintAdapters";
import { cn } from "../utils/cn";

interface CommunityImpactPageProps {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
}

const campaigns = [
  {
    id: "river-cleaning",
    title: "River Cleaning Drive",
    location: "Yamuna Ghat",
    type: "River cleanup",
    progress: 68,
    volunteers: 148,
    urgency: "High",
    countdown: "18h left",
    coordinates: { lat: 28.6322, lng: 77.2491 },
    color: "#0f766e",
    icon: Waves,
  },
  {
    id: "garbage-cleaning",
    title: "Garbage Hotspot Cleanup",
    location: "Market Road",
    type: "Garbage cleaning",
    progress: 42,
    volunteers: 73,
    urgency: "Medium",
    countdown: "2d left",
    coordinates: { lat: 28.6216, lng: 77.2101 },
    color: "#ea580c",
    icon: Sparkles,
  },
  {
    id: "tree-plantation",
    title: "Tree Plantation Sprint",
    location: "Community Park",
    type: "Tree plantation",
    progress: 81,
    volunteers: 214,
    urgency: "Low",
    countdown: "5d left",
    coordinates: { lat: 28.6448, lng: 77.2167 },
    color: "#16a34a",
    icon: TreePine,
  },
  {
    id: "blood-donation",
    title: "Blood Donation Camp",
    location: "Civil Hospital",
    type: "Health response",
    progress: 55,
    volunteers: 96,
    urgency: "High",
    countdown: "9h left",
    coordinates: { lat: 28.6381, lng: 77.2312 },
    color: "#dc2626",
    icon: Heart,
  },
  {
    id: "flood-relief",
    title: "Flood Relief Supply Chain",
    location: "Low-lying Ward 12",
    type: "Flood relief",
    progress: 34,
    volunteers: 51,
    urgency: "Emergency",
    countdown: "Live SOS",
    coordinates: { lat: 28.6169, lng: 77.2389 },
    color: "#7c3aed",
    icon: ShieldAlert,
  },
];

const feedItems = [
  {
    id: "feed-1",
    author: "GreenSteps NGO",
    badge: "River crew",
    title: "Plastic removed before the evening tide",
    body: "Volunteers cleared the walkway and moved recyclables to the ward collection point.",
    before: "bg-[linear-gradient(135deg,#334155,#64748b_45%,#94a3b8)]",
    after: "bg-[linear-gradient(135deg,#0f766e,#22c55e_55%,#bae6fd)]",
    likes: 284,
    comments: 36,
    shares: 19,
    progress: "68%",
  },
  {
    id: "feed-2",
    author: "Ward 8 Volunteers",
    badge: "Cleanup team",
    title: "Market garbage point restored",
    body: "The lane is usable again and shopkeepers joined the maintenance roster.",
    before: "bg-[linear-gradient(135deg,#78350f,#a16207_45%,#facc15)]",
    after: "bg-[linear-gradient(135deg,#0369a1,#22c55e_48%,#f8fafc)]",
    likes: 193,
    comments: 22,
    shares: 11,
    progress: "42%",
  },
  {
    id: "feed-3",
    author: "Youth Civic Circle",
    badge: "Plantation crew",
    title: "120 saplings adopted by residents",
    body: "Each tree now has a local caretaker and weekly watering reminders.",
    before: "bg-[linear-gradient(135deg,#57534e,#a8a29e_52%,#d6d3d1)]",
    after: "bg-[linear-gradient(135deg,#15803d,#65a30d_55%,#bbf7d0)]",
    likes: 421,
    comments: 48,
    shares: 34,
    progress: "81%",
  },
];

const emergencyAlerts = [
  {
    title: "Flood alert near Ward 12",
    detail: "Supply volunteers needed for dry food and drinking water kits.",
    distance: "1.8 km",
    people: 31,
    tone: "bg-violet-50 text-violet-800 ring-violet-100",
  },
  {
    title: "Fire rescue support",
    detail: "Nearby volunteers requested for crowd guidance and first-aid standby.",
    distance: "3.2 km",
    people: 17,
    tone: "bg-rose-50 text-rose-800 ring-rose-100",
  },
  {
    title: "SOS transport needed",
    detail: "Two vehicles needed to move relief boxes to the shelter.",
    distance: "4.6 km",
    people: 9,
    tone: "bg-amber-50 text-amber-800 ring-amber-100",
  },
];

const profiles = [
  {
    name: "Asha Foundation",
    role: "NGO Partner",
    score: 96,
    hours: 1280,
    drives: 42,
    badges: ["Rapid responder", "Trusted NGO", "Top cleanup"],
    initials: "AF",
  },
  {
    name: "Rohan Mehta",
    role: "Volunteer Lead",
    score: 91,
    hours: 410,
    drives: 18,
    badges: ["Flood relief", "Mentor", "5-star"],
    initials: "RM",
  },
  {
    name: "Seva Youth Group",
    role: "Community Team",
    score: 88,
    hours: 760,
    drives: 27,
    badges: ["Tree guardian", "Night patrol", "Donor circle"],
    initials: "SY",
  },
];

function getIssueColor(urgency: string, status: string) {
  if (status === "Resolved") return "#64748b";
  if (urgency === "Critical") return "#dc2626";
  if (urgency === "High") return "#ea580c";
  if (urgency === "Low") return "#16a34a";
  return "#ca8a04";
}

function getMapCenter(complaints: NormalizedComplaint[]) {
  const points = complaints.filter((complaint) => complaint.coordinates);
  if (!points.length) return [28.6322, 77.2219] as [number, number];

  return [
    points.reduce((sum, complaint) => sum + complaint.coordinates!.lat, 0) / points.length,
    points.reduce((sum, complaint) => sum + complaint.coordinates!.lng, 0) / points.length,
  ] as [number, number];
}

export function CommunityImpactPage({ snapshot, isLoading }: CommunityImpactPageProps) {
  const liveComplaints = normalizeComplaints(snapshot?.complaints ?? [])
    .filter((complaint) => complaint.coordinates)
    .slice(0, 18);
  const activeVolunteers = campaigns.reduce((sum, campaign) => sum + campaign.volunteers, 0);
  const resolvedIssues = snapshot?.complaints.filter((complaint) => complaint.status === "Resolved").length ?? 0;
  const completedCampaigns = campaigns.filter((campaign) => campaign.progress >= 80).length;
  const donationsCollected = 8.4;

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton variant="stat" />
        <LoadingSkeleton variant="complaint" />
        <LoadingSkeleton variant="complaint" />
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <HeroMapSection complaints={liveComplaints} />

      <ImpactStats
        activeVolunteers={activeVolunteers}
        resolvedIssues={resolvedIssues}
        completedCampaigns={completedCampaigns}
        donationsCollected={donationsCollected}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <CommunityFeed />
        <aside className="grid content-start gap-6">
          <LiveCampaigns />
          <EmergencyAlerts />
        </aside>
      </div>

      <VolunteerProfiles />
    </section>
  );
}

function HeroMapSection({ complaints }: { complaints: ReturnType<typeof normalizeComplaints> }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-premium backdrop-blur">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[500px] overflow-hidden">
          <MapContainer
            key={complaints.map((complaint) => complaint.id).join("-") || "community-map"}
            center={getMapCenter(complaints)}
            zoom={13}
            scrollWheelZoom={false}
            className="absolute inset-0 z-0 h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {complaints.map((complaint) => {
              const color = getIssueColor(complaint.urgency, complaint.status);
              return (
                <CircleMarker
                  key={complaint.id}
                  center={[complaint.coordinates!.lat, complaint.coordinates!.lng]}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.72, weight: 2 }}
                  radius={complaint.urgency === "Critical" ? 15 : complaint.urgency === "High" ? 12 : 9}
                >
                  <Popup>
                    <strong>{complaint.ticketId}</strong>
                    <p>{complaint.category}</p>
                    <p>{complaint.summary}</p>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    {complaint.category}
                  </Tooltip>
                </CircleMarker>
              );
            })}
            {campaigns.map((campaign) => (
              <CircleMarker
                key={campaign.id}
                center={[campaign.coordinates.lat, campaign.coordinates.lng]}
                pathOptions={{
                  color: campaign.color,
                  fillColor: campaign.color,
                  fillOpacity: 0.36,
                  dashArray: "6 4",
                  weight: 3,
                }}
                radius={18}
              >
                <Popup>
                  <strong>{campaign.title}</strong>
                  <p>{campaign.type}</p>
                  <p>{campaign.volunteers} volunteers</p>
                </Popup>
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  {campaign.title}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="pointer-events-none absolute inset-x-4 top-4 z-[400] flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-black uppercase text-teal-800 shadow-sm backdrop-blur">
              <Navigation size={14} />
              GPS discovery
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-black uppercase text-rose-800 shadow-sm backdrop-blur">
              <Radio size={14} />
              Emergency zones
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-black uppercase text-blue-800 shadow-sm backdrop-blur">
              <MapPin size={14} />
              Live issue pins
            </span>
          </div>
        </div>

        <aside className="grid content-between gap-5 bg-white/85 p-6 backdrop-blur">
          <div>
            <StatusBadge tone="neutral">
              <HeartHandshake size={14} />
              Community Impact
            </StatusBadge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">
              Civic action around you
            </h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-muted">
              Discover nearby civic issues, join live campaigns, and coordinate relief with local volunteers.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              ["#dc2626", "Emergency issue"],
              ["#ea580c", "High priority"],
              ["#0f766e", "Campaign marker"],
              ["#16a34a", "Low impact zone"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-bold text-ink">
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              </div>
            ))}
          </div>

          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white shadow-lift transition hover:-translate-y-0.5">
            <Users size={18} />
            Find nearby volunteers
          </button>
        </aside>
      </div>
    </section>
  );
}

function ImpactStats({
  activeVolunteers,
  resolvedIssues,
  completedCampaigns,
  donationsCollected,
}: {
  activeVolunteers: number;
  resolvedIssues: number;
  completedCampaigns: number;
  donationsCollected: number;
}) {
  const stats = [
    { label: "Active volunteers", value: activeVolunteers.toLocaleString(), icon: Users, tone: "text-teal-700 bg-teal-50" },
    { label: "Resolved issues", value: resolvedIssues.toLocaleString(), icon: ShieldAlert, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Completed campaigns", value: completedCampaigns.toLocaleString(), icon: Award, tone: "text-blue-700 bg-blue-50" },
    { label: "Donations collected", value: `₹${donationsCollected}L`, icon: Heart, tone: "text-rose-700 bg-rose-50" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="rounded-xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lift">
            <span className={cn("grid size-11 place-items-center rounded-full", stat.tone)}>
              <Icon size={20} />
            </span>
            <strong className="mt-4 block text-3xl font-black text-ink">{stat.value}</strong>
            <span className="mt-1 block text-sm font-bold text-muted">{stat.label}</span>
          </article>
        );
      })}
    </section>
  );
}

function CommunityFeed() {
  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <StatusBadge tone="info">
            <Sparkles size={14} />
            Activity Feed
          </StatusBadge>
          <h2 className="mt-3 text-3xl font-black text-ink">Community updates</h2>
        </div>
        <button className="hidden min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-black text-ink shadow-sm transition hover:-translate-y-0.5 sm:inline-flex">
          <Share2 size={15} />
          Share impact
        </button>
      </div>

      {feedItems.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lift">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="grid grid-cols-2">
              <div className={cn("relative min-h-48", item.before)}>
                <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-black uppercase text-white">
                  Before
                </span>
              </div>
              <div className={cn("relative min-h-48", item.after)}>
                <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800">
                  After
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-teal-600 to-blue-600 text-sm font-black text-white">
                    {item.author.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong className="block text-sm text-ink">{item.author}</strong>
                    <span className="text-xs font-bold text-muted">{item.badge}</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100">
                  {item.progress}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-ink">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.body}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SocialButton icon={<Heart size={15} />} label={`${item.likes}`} />
                <SocialButton icon={<MessageCircle size={15} />} label={`${item.comments}`} />
                <SocialButton icon={<Share2 size={15} />} label={`${item.shares}`} />
                <button className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-teal-700 px-4 text-xs font-black text-white transition hover:-translate-y-0.5">
                  <Users size={15} />
                  Join Campaign
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-slate-50 px-3 text-xs font-black text-muted transition hover:bg-white hover:text-ink">
      {icon}
      {label}
    </button>
  );
}

function LiveCampaigns() {
  return (
    <section className="rounded-xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-ink">Live campaigns</h2>
        <StatusBadge tone="neutral">
          <Radio size={14} />
          Live
        </StatusBadge>
      </div>
      <div className="grid gap-3">
        {campaigns.map((campaign) => {
          const Icon = campaign.icon;
          return (
            <article key={campaign.id} className="rounded-lg border border-line bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: campaign.color }}>
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-ink">{campaign.title}</h3>
                      <p className="mt-1 text-xs font-bold text-muted">{campaign.location}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", campaign.urgency === "Emergency" ? "bg-rose-100 text-rose-700" : "bg-white text-slate-600")}>
                      {campaign.urgency}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full" style={{ width: `${campaign.progress}%`, backgroundColor: campaign.color }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} />
                      {campaign.volunteers} volunteers
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={14} />
                      {campaign.countdown}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EmergencyAlerts() {
  return (
    <section className="rounded-xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Flame size={20} className="text-rose-600" />
        <h2 className="text-2xl font-black text-ink">Emergency alerts</h2>
      </div>
      <div className="grid gap-3">
        {emergencyAlerts.map((alert) => (
          <article key={alert.title} className={cn("rounded-lg p-4 ring-1", alert.tone)}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <h3 className="font-black">{alert.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 opacity-85">{alert.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
                  <span>{alert.distance}</span>
                  <span>{alert.people} SOS volunteers</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VolunteerProfiles() {
  return (
    <section className="grid gap-4">
      <div>
        <StatusBadge tone="success">
          <Award size={14} />
          Reputation
        </StatusBadge>
        <h2 className="mt-3 text-3xl font-black text-ink">NGO and volunteer profiles</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {profiles.map((profile) => (
          <article key={profile.name} className="rounded-xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lift">
            <div className="flex items-start gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-600 via-blue-600 to-violet-600 text-sm font-black text-white">
                {profile.initials}
              </span>
              <div>
                <h3 className="text-lg font-black text-ink">{profile.name}</h3>
                <p className="text-sm font-bold text-muted">{profile.role}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <ProfileStat label="Impact" value={profile.score} />
              <ProfileStat label="Hours" value={profile.hours} />
              <ProfileStat label="Drives" value={profile.drives} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600 ring-1 ring-line">
                  <Star size={12} />
                  {badge}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-2 py-3">
      <strong className="block text-lg font-black text-ink">{value.toLocaleString()}</strong>
      <span className="mt-1 block text-[11px] font-black uppercase text-muted">{label}</span>
    </div>
  );
}
