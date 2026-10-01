const backendPort = "8787";

function isLoopbackHost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function getSameHostBackendUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
}

function getConfiguredUrlHost(configuredUrl?: string) {
  if (!configuredUrl) {
    return "";
  }

  try {
    return new URL(configuredUrl).hostname;
  } catch {
    return "";
  }
}

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const browserHost = typeof window === "undefined" ? "localhost" : window.location.hostname;
  const configuredHost = getConfiguredUrlHost(configuredUrl);

  if (import.meta.env.DEV) {
    if (configuredUrl && (isLoopbackHost(browserHost) || !isLoopbackHost(configuredHost))) {
      return configuredUrl;
    }

    return getSameHostBackendUrl();
  }

  if (configuredUrl && (!isLoopbackHost(configuredHost) || isLoopbackHost(browserHost))) {
    return configuredUrl;
  }

  return "";
}

export async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? options.headers
    : {
        "Content-Type": "application/json",
        ...options.headers,
      };

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed with ${response.status}`;

      try {
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
          details?: Array<{ msg?: string; message?: string }>;
        };
        message =
          payload.details?.[0]?.msg ??
          payload.details?.[0]?.message ??
          payload.error ??
          payload.message ??
          message;
      } catch {
        // Keep the status-based message when the response body is not JSON.
      }

      throw new Error(message);
    }

    const payload = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      "data" in payload
    ) {
      return payload.data as T;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Backend request timed out. Please try again in a moment.",
      );
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      const apiBaseUrl = getApiBaseUrl();
      const isLocalApi = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
      throw new Error(
        isLocalApi
          ? `CivicFlow API is not reachable at ${apiBaseUrl}. Start the backend with npm run start:backend, restart the frontend after .env changes, and confirm /api/health is online.`
          : `CivicFlow API is not reachable at ${apiBaseUrl || "same-origin /api"}. Confirm /api/health is online and the production environment variables are configured.`,
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
