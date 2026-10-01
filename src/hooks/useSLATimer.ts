// Usage:
// const sla = useSLATimer(complaint.createdAt, getSlaHoursForUrgency(complaint.urgency));
import { useEffect, useMemo, useState } from "react";
export { SLA_RESPONSE_HOURS } from "../utils/slaRules";

interface SLATimerState {
  timeRemaining: string;
  isBreached: boolean;
  statusText: string;
  color: "#16a34a" | "#dc2626";
}

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const breachedText = "\u26A0\uFE0F SLA Breached";

function formatRemaining(milliseconds: number) {
  const absolute = Math.abs(milliseconds);
  const hours = Math.floor(absolute / hourMs);
  const minutes = Math.max(0, Math.ceil((absolute % hourMs) / minuteMs));

  if (hours <= 0) {
    return `${minutes}m remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

function getSlaState(createdAt: string, slaHours: number): SLATimerState {
  const createdTime = new Date(createdAt).getTime();
  const safeCreatedTime = Number.isNaN(createdTime) ? Date.now() : createdTime;
  const deadline = safeCreatedTime + slaHours * hourMs;
  const remaining = deadline - Date.now();
  const isBreached = remaining <= 0;

  return {
    timeRemaining: isBreached ? "0m remaining" : formatRemaining(remaining),
    isBreached,
    statusText: isBreached ? breachedText : "On Track",
    color: isBreached ? "#dc2626" : "#16a34a",
  };
}

export default function useSLATimer(
  createdAt: string,
  slaHours: number,
): SLATimerState {
  const initialState = useMemo(
    () => getSlaState(createdAt, slaHours),
    [createdAt, slaHours],
  );
  const [state, setState] = useState<SLATimerState>(initialState);

  useEffect(() => {
    setState(getSlaState(createdAt, slaHours));

    const timer = window.setInterval(() => {
      setState(getSlaState(createdAt, slaHours));
    }, minuteMs);

    return () => window.clearInterval(timer);
  }, [createdAt, slaHours]);

  return state;
}
