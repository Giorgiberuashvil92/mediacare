export const PRODUCTION_API_URL =
  "https://mediacare-production.up.railway.app";

/** Same-origin proxy path (next.config rewrite → Railway). Avoids browser CORS. */
export const BROWSER_API_PROXY_PREFIX = "/api/proxy";

function isLocalhostApiUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function isBrowserOnDeployedHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

/**
 * Browser (Vercel): `/api/proxy` → Next rewrite → Railway (no CORS).
 * Server / local: direct Railway or localhost.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  // Deployed admin in the browser: always use same-origin proxy
  if (isBrowserOnDeployedHost()) {
    return BROWSER_API_PROXY_PREFIX;
  }

  // Next.js server (RSC / route handlers): talk to Railway directly
  if (typeof window === "undefined") {
    if (process.env.NODE_ENV === "production") {
      const serverUrl =
        process.env.API_URL?.trim() ||
        (fromEnv && !isLocalhostApiUrl(fromEnv) ? fromEnv : null);
      return (serverUrl || PRODUCTION_API_URL).replace(/\/$/, "");
    }
    return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
  }

  // Local browser
  return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
}
