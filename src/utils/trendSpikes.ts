import {
  normalizeComplaints,
  type ComplaintDataSource,
  type NormalizedComplaint,
} from "./complaintAdapters";

export interface TrendSpikeSignal {
  id: string;
  sector: string;
  category: string;
  count: number;
  timeframe: string;
  startTime: string;
  endTime: string;
  riskScore: number;
  criticalCount: number;
  highCount: number;
  complaints: NormalizedComplaint[];
}

const twoHoursMs = 2 * 60 * 60 * 1000;
const urgencyWeight = {
  CRITICAL: 6,
  High: 4,
  Medium: 2,
  Low: 1,
};

function getTopCategory(categories: string[]) {
  const counts = categories.reduce<Record<string, number>>((accumulator, category) => {
    accumulator[category] = (accumulator[category] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? "Civic";
}

function formatTimeRange(startTime: Date, endTime: Date) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  return `${startTime.toLocaleTimeString([], options)} - ${endTime.toLocaleTimeString([], options)}`;
}

export function getTrendSpikeSignals(
  complaints: ComplaintDataSource[],
): TrendSpikeSignal[] {
  const bySector = new Map<string, ReturnType<typeof normalizeComplaints>>();

  normalizeComplaints(complaints).forEach((complaint) => {
    const current = bySector.get(complaint.sector) ?? [];
    current.push(complaint);
    bySector.set(complaint.sector, current);
  });

  return Array.from(bySector.entries())
    .flatMap(([sector, sectorComplaints]) => {
      const ordered = [...sectorComplaints].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
      );
      const sectorSpikes: TrendSpikeSignal[] = [];

      for (let start = 0; start < ordered.length; start += 1) {
        const startTime = new Date(ordered[start].createdAt).getTime();
        const windowComplaints = ordered.filter((complaint) => {
          const complaintTime = new Date(complaint.createdAt).getTime();
          return complaintTime >= startTime && complaintTime - startTime <= twoHoursMs;
        });

        if (windowComplaints.length >= 3) {
          const firstTime = new Date(windowComplaints[0].createdAt);
          const lastTime = new Date(windowComplaints[windowComplaints.length - 1].createdAt);
          const categories = windowComplaints.map((complaint) => complaint.category);
          const riskScore = windowComplaints.reduce(
            (total, complaint) => total + urgencyWeight[complaint.urgencyKey],
            0,
          );

          sectorSpikes.push({
            id: `${sector}-${windowComplaints[0].id}`,
            sector,
            category: getTopCategory(categories),
            count: windowComplaints.length,
            timeframe: formatTimeRange(firstTime, lastTime),
            startTime: firstTime.toISOString(),
            endTime: lastTime.toISOString(),
            riskScore,
            criticalCount: windowComplaints.filter(
              (complaint) => complaint.urgencyKey === "CRITICAL",
            ).length,
            highCount: windowComplaints.filter(
              (complaint) => complaint.urgencyKey === "High",
            ).length,
            complaints: windowComplaints,
          });
        }
      }

      const deduped = new Map<string, TrendSpikeSignal>();
      sectorSpikes.forEach((spike) => {
        const key = `${spike.sector}-${spike.startTime}-${spike.endTime}`;
        const existing = deduped.get(key);

        if (!existing || spike.riskScore > existing.riskScore) {
          deduped.set(key, spike);
        }
      });

      return Array.from(deduped.values());
    })
    .sort((first, second) => second.riskScore - first.riskScore);
}
