import { DashboardPage } from "./pages/DashboardPage";
import { TrackingPage } from "./pages/TrackingPage";

export function App() {
  if (window.location.pathname.startsWith("/track/")) {
    return <TrackingPage />;
  }

  return <DashboardPage />;
}
