import {
  DEPARTMENT_BY_CATEGORY,
  PUBLIC_STATUSES,
  slugCategory,
} from "../constants/workflow.js";
import { complaintRepository } from "../repositories/complaintRepository.js";
import { getCommunicationSummary } from "./communicationService.js";
import { toDashboardComplaint } from "./complaintSerializer.js";

export async function getDashboardSnapshot() {
  const complaints = await complaintRepository.listForDashboard();
  const communicationSummaries = await Promise.all(
    complaints.map((complaint) => getCommunicationSummary(complaint.ticketId)),
  );
  const dashboardComplaints = complaints.map((complaint, index) => {
    const complaintObject = complaint.toObject ? complaint.toObject() : complaint;
    return toDashboardComplaint({
      ...complaintObject,
      communicationSummary: communicationSummaries[index],
    });
  });
  const categoryNames = [
    ...new Set([
      ...Object.keys(DEPARTMENT_BY_CATEGORY),
      ...dashboardComplaints.map((item) => item.category),
    ]),
  ].sort();

  return {
    generatedAt: new Date().toISOString(),
    stats: [
      {
        id: "total-complaints",
        label: "Total complaints",
        value: String(complaints.length),
        delta: "Live MongoDB",
        tone: "teal",
      },
      {
        id: "open-complaints",
        label: "Open complaints",
        value: String(
          complaints.filter((item) => !["Resolved", "Rejected"].includes(item.status)).length,
        ),
        delta: "Pending or active",
        tone: "amber",
      },
      {
        id: "critical-flags",
        label: "Critical flags",
        value: String(complaints.filter((item) => item.priority === "Critical").length),
        delta: "Emergency queue",
        tone: "rose",
      },
      {
        id: "privacy-masked",
        label: "Privacy masked",
        value: "100%",
        delta: "Citizen names and phones protected",
        tone: "emerald",
      },
    ],
    statuses: PUBLIC_STATUSES.map((status) => ({
      id: status,
      label: status,
      count: dashboardComplaints.filter((complaint) => complaint.status === status).length,
      description: `${status} complaints`,
      tone:
        status === "Resolved"
          ? "emerald"
          : status === "In Progress"
            ? "amber"
            : status === "Assigned"
              ? "blue"
              : "rose",
    })),
    complaints: dashboardComplaints,
    categories: [
      { label: "All categories", value: "all" },
      ...categoryNames.map((category) => ({
        label: category,
        value: slugCategory(category),
      })),
    ],
    statusFilters: [
      { label: "All status", value: "all" },
      ...PUBLIC_STATUSES.map((status) => ({ label: status, value: status })),
    ],
  };
}
