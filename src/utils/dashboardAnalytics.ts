import {
  normalizeComplaints,
  type ComplaintDataSource,
} from "./complaintAdapters";

export interface SectorSignal {
  sector: string;
  total: number;
  critical: number;
  high: number;
  open: number;
  topCategory: string;
  pressureScore: number;
}

export interface CategorySignal {
  category: string;
  total: number;
  critical: number;
  open: number;
  topSector: string;
  pressureScore: number;
}

const urgencyWeight = {
  CRITICAL: 6,
  High: 4,
  Medium: 2,
  Low: 1,
};

function getTopValue(values: string[]) {
  const counts = values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? "Mixed";
}

export function getSectorSignals(complaints: ComplaintDataSource[]): SectorSignal[] {
  const normalized = normalizeComplaints(complaints);
  const sectors = new Map<string, typeof normalized>();

  normalized.forEach((complaint) => {
    sectors.set(complaint.sector, [...(sectors.get(complaint.sector) ?? []), complaint]);
  });

  return Array.from(sectors.entries())
    .map(([sector, sectorComplaints]) => ({
      sector,
      total: sectorComplaints.length,
      critical: sectorComplaints.filter((complaint) => complaint.urgencyKey === "CRITICAL").length,
      high: sectorComplaints.filter((complaint) => complaint.urgencyKey === "High").length,
      open: sectorComplaints.filter((complaint) => complaint.status !== "Resolved").length,
      topCategory: getTopValue(sectorComplaints.map((complaint) => complaint.category)),
      pressureScore: sectorComplaints.reduce(
        (total, complaint) => total + urgencyWeight[complaint.urgencyKey],
        0,
      ),
    }))
    .sort((first, second) => second.pressureScore - first.pressureScore);
}

export function getCategorySignals(complaints: ComplaintDataSource[]): CategorySignal[] {
  const normalized = normalizeComplaints(complaints);
  const categories = new Map<string, typeof normalized>();

  normalized.forEach((complaint) => {
    categories.set(complaint.category, [
      ...(categories.get(complaint.category) ?? []),
      complaint,
    ]);
  });

  return Array.from(categories.entries())
    .map(([category, categoryComplaints]) => ({
      category,
      total: categoryComplaints.length,
      critical: categoryComplaints.filter((complaint) => complaint.urgencyKey === "CRITICAL").length,
      open: categoryComplaints.filter((complaint) => complaint.status !== "Resolved").length,
      topSector: getTopValue(categoryComplaints.map((complaint) => complaint.sector)),
      pressureScore: categoryComplaints.reduce(
        (total, complaint) => total + urgencyWeight[complaint.urgencyKey],
        0,
      ),
    }))
    .sort((first, second) => second.pressureScore - first.pressureScore);
}
