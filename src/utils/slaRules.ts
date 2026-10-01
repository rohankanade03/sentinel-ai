import { normalizeUrgency } from "./complaintAdapters";

export const SLA_RESPONSE_HOURS = {
  CRITICAL: 0.25,
  High: 1,
  Medium: 4,
  Low: 24,
} as const;

const slaRules = {
  CRITICAL: {
    label: "Critical",
    response: "15 min auto-response",
    resolution: "6-12 hour physical resolution",
    escalation: "Alert Commissioner if unassigned after 1 hour.",
  },
  High: {
    label: "High",
    response: "1 hour auto-response",
    resolution: "24 hour physical resolution",
    escalation: "Notify Dept Head if unassigned after 4 hours.",
  },
  Medium: {
    label: "Medium",
    response: "4 hour auto-response",
    resolution: "3-5 day physical resolution",
    escalation: "Weekly report to Dept Head.",
  },
  Low: {
    label: "Low",
    response: "24 hour auto-response",
    resolution: "7-10 day physical resolution",
    escalation: "Standard administrative queue.",
  },
} as const;

export function getSlaHoursForUrgency(urgency: string): number {
  return SLA_RESPONSE_HOURS[normalizeUrgency(urgency)];
}

export function getSlaRuleForUrgency(urgency: string) {
  return slaRules[normalizeUrgency(urgency)];
}
