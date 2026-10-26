export const PRODUCTION_API_URL =
  "https://mediacare-production.up.railway.app";

/** Same-origin proxy on Vercel — avoids CORS and ignores bad localhost env. */
export const BROWSER_API_PROXY_PREFIX = "/api/proxy";

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function isDeployedBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

/**
 * - Vercel browser → `/api/proxy` (server forwards to Railway)
 * - Local browser → localhost / NEXT_PUBLIC_API_URL
 * - Next server → Railway (never localhost in production)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (isDeployedBrowser()) {
    return BROWSER_API_PROXY_PREFIX;
  }

  if (typeof window === "undefined") {
    if (process.env.NODE_ENV === "production") {
      const serverUrl =
        process.env.API_URL?.trim() ||
        (fromEnv && !isLocalhostUrl(fromEnv) ? fromEnv : null);
      return (serverUrl || PRODUCTION_API_URL).replace(/\/$/, "");
    }
    return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
  }

  return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
}
