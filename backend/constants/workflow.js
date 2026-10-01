export const WORKFLOW_STATUSES = [
  "Pending",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected",
];

export const PUBLIC_STATUSES = ["Received", "Assigned", "In Progress", "Resolved"];

export const COMPLAINT_CATEGORIES = [
  "Electricity",
  "Encroachment",
  "Fire & Emergency",
  "Noise Pollution",
  "Public Safety",
  "Public Amenities",
  "Sanitation",
  "Road & Infrastructure",
  "Water Supply",
  "Other",
];

export const CATEGORY_KEYWORDS = [
  { category: "Water Supply", words: ["pani", "water", "leak", "pipeline", "supply"] },
  { category: "Road & Infrastructure", words: ["road", "sadak", "pothole", "toot", "zebra", "footpath"] },
  { category: "Sanitation", words: ["kachra", "garbage", "gutter", "sewage", "overflow", "drain"] },
  { category: "Electricity", words: ["bijli", "electric", "street light", "transformer", "power", "light band"] },
  { category: "Fire & Emergency", words: ["fire", "aag", "blast", "collapse", "danger", "injured"] },
  { category: "Noise Pollution", words: ["noise", "loudspeaker", "dj", "horn"] },
  { category: "Encroachment", words: ["illegal", "encroach", "parking", "vendor"] },
  { category: "Public Safety", words: ["safety", "risk", "crime", "unsafe", "children"] },
  { category: "Public Amenities", words: ["park", "bench", "toilet", "bus stop", "street sign", "public tap"] },
];

export const DEPARTMENT_BY_CATEGORY = {
  Electricity: "Electrical Response Cell",
  Encroachment: "Zonal Enforcement Team",
  "Fire & Emergency": "Emergency Control Room",
  "Noise Pollution": "Environmental Compliance Desk",
  "Public Amenities": "Public Works Support",
  "Public Safety": "Public Safety Coordination",
  "Road & Infrastructure": "Roads and Infrastructure Cell",
  Sanitation: "Sanitation Field Office",
  "Water Supply": "Water Operations Desk",
  Other: "Civic Operations Desk",
};

export const PUBLIC_STATUS_BY_WORKFLOW = {
  Pending: "Received",
  "Under Review": "Received",
  Assigned: "Assigned",
  "In Progress": "In Progress",
  Resolved: "Resolved",
  Rejected: "Resolved",
};

export const WORKFLOW_STATUS_BY_PUBLIC = {
  Received: "Pending",
  Assigned: "Assigned",
  "In Progress": "In Progress",
  Resolved: "Resolved",
};

export const SLA_RESPONSE_HOURS = {
  Critical: 0.5,
  High: 4,
  Medium: 24,
  Low: 72,
};

export function toPublicStatus(status = "Pending") {
  return PUBLIC_STATUS_BY_WORKFLOW[status] || status;
}

export function toWorkflowStatus(status = "Pending") {
  return WORKFLOW_STATUS_BY_PUBLIC[status] || status;
}

export function getDepartmentForCategory(category = "Other") {
  return DEPARTMENT_BY_CATEGORY[category] || DEPARTMENT_BY_CATEGORY.Other;
}

export function normalizeComplaintCategory(category) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const matchedCategory = COMPLAINT_CATEGORIES.find(
    (item) => item.toLowerCase() === normalizedCategory,
  );

  return matchedCategory || "Other";
}

export function inferCategoryFromText(...parts) {
  const searchableText = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!searchableText.trim()) {
    return "Other";
  }

  return (
    CATEGORY_KEYWORDS.find((rule) =>
      rule.words.some((word) => searchableText.includes(word.toLowerCase())),
    )?.category || "Other"
  );
}

export function getSlaDueAt(priority = "Medium", from = new Date()) {
  const hours = SLA_RESPONSE_HOURS[priority] ?? SLA_RESPONSE_HOURS.Medium;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function getSlaState({ status, slaDueAt, resolvedAt }) {
  if (status === "Resolved") {
    return resolvedAt && slaDueAt && new Date(resolvedAt) > new Date(slaDueAt)
      ? "breached"
      : "met";
  }

  if (slaDueAt && new Date() > new Date(slaDueAt)) {
    return "breached";
  }

  return "active";
}

export function slugCategory(category) {
  return String(category)
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
