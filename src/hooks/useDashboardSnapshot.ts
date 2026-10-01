import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getApiBaseUrl } from "../api/backendClient";
import { getDashboardSnapshot } from "../services/dashboardService";
import type { DashboardSnapshot } from "../types/dashboard";

interface DashboardSnapshotState {
  data: DashboardSnapshot | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardSnapshot(): DashboardSnapshotState {
  const [state, setState] = useState<DashboardSnapshotState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    let loadingTimer: number | undefined;
    let pollTimer: number | undefined;

    async function loadSnapshot(showLoading = false) {
      try {
        if (showLoading) {
          setState((current) => ({ ...current, isLoading: true, error: null }));
        }

        const snapshot = await getDashboardSnapshot();

        loadingTimer = window.setTimeout(() => {
          if (isMounted) {
            setState({ data: snapshot, isLoading: false, error: null });
          }
        }, 420);
      } catch (error) {
        if (isMounted) {
          setState((current) => ({
            data: current.data,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Dashboard data could not be loaded.",
          }));
        }
      }
    }

    loadSnapshot(true);
    pollTimer = window.setInterval(() => loadSnapshot(false), 12000);

    const socket = io(getApiBaseUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socket.emit("admin:join");
    socket.on("complaint:created", () => loadSnapshot(false));
    socket.on("complaint:updated", () => loadSnapshot(false));

    return () => {
      isMounted = false;
      if (loadingTimer) {
        window.clearTimeout(loadingTimer);
      }
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
      socket.disconnect();
    };
  }, []);

  return state;
}
