import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import {
  normalizeComplaints,
  type ComplaintDataSource,
} from "../utils/complaintAdapters";

interface ComplaintHeatmapProps {
  complaints: ComplaintDataSource[];
  isLoading?: boolean;
}

const urgencyStyles = {
  CRITICAL: { color: "#dc2626", radius: 16, label: "CRITICAL" },
  High: { color: "#ea580c", radius: 12, label: "High" },
  Medium: { color: "#ca8a04", radius: 9, label: "Medium" },
  Low: { color: "#16a34a", radius: 7, label: "Low" },
  Resolved: { color: "#6b7280", radius: 8, label: "Resolved" },
};

export default function ComplaintHeatmap({
  complaints,
  isLoading = false,
}: ComplaintHeatmapProps) {
  const mappedComplaints = normalizeComplaints(complaints)
    .filter((complaint) => complaint.coordinates)
    .map((complaint) => ({
      ...complaint,
      coordinates: complaint.coordinates!,
    }));
  const mapCenter =
    mappedComplaints.length > 0
      ? [
          mappedComplaints.reduce(
            (sum, complaint) => sum + complaint.coordinates.lat,
            0,
          ) / mappedComplaints.length,
          mappedComplaints.reduce(
            (sum, complaint) => sum + complaint.coordinates.lng,
            0,
          ) / mappedComplaints.length,
        ]
      : [28.63, 77.21];
  const sectorCounts = mappedComplaints.reduce<Record<string, number>>(
    (counts, complaint) => ({
      ...counts,
      [complaint.sector]: (counts[complaint.sector] ?? 0) + 1,
    }),
    {},
  );

  if (isLoading) {
    return (
      <div className="h-[440px] animate-pulse rounded-xl border border-line bg-slate-100" />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="h-[420px] overflow-hidden rounded-lg border border-line">
          <MapContainer
            key={mappedComplaints.map((complaint) => complaint.id).join("-")}
            center={mapCenter as [number, number]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappedComplaints.map((complaint) => {
              const style =
                complaint.status === "Resolved"
                  ? urgencyStyles.Resolved
                  : urgencyStyles[complaint.urgencyKey];

              return (
                <CircleMarker
                  key={complaint.id}
                  center={[complaint.coordinates.lat, complaint.coordinates.lng]}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.color,
                    fillOpacity: 0.5,
                    weight: 2,
                  }}
                  radius={style.radius}
                >
                  <Popup>
                    <div className="space-y-1">
                      <strong>{complaint.ticketId}</strong>
                      <div>{complaint.category}</div>
                      <div>{style.label}</div>
                      <p>{complaint.summary}</p>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.92}>
                    {complaint.sector}
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="grid content-start gap-4">
          <div>
            <h3 className="text-lg font-black text-ink">Sector heatmap</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted">
              Live map layer using saved GPS coordinates and urgency colors.
            </p>
          </div>

          <div className="grid gap-2">
            {Object.entries(urgencyStyles).map(([key, style]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-bold text-ink">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: style.color }}
                  />
                  {style.label}
                </span>
                <span className="text-xs font-semibold text-muted">
                  r{style.radius}
                </span>
              </div>
            ))}
          </div>

          {mappedComplaints.length ? (
            <div className="grid gap-2 border-t border-line pt-4">
              {Object.entries(sectorCounts).map(([sector, count]) => (
                <div key={sector} className="flex justify-between text-sm">
                  <span className="font-semibold text-muted">{sector}</span>
                  <strong className="text-ink">{count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
              No saved coordinates yet. New GPS or manual-pin complaints will appear here.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
