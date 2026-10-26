export const PRODUCTION_API_URL =
  "https://mediacare-production.up.railway.app";

function isLocalhostApiUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * ლოკალურად: .env.local → NEXT_PUBLIC_API_URL=http://localhost:4001
 * Vercel/production: არასდროს localhost — თუ env ცუდადაა, Railway fallback.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (process.env.NODE_ENV === "production") {
    if (fromEnv && !isLocalhostApiUrl(fromEnv)) {
      return fromEnv.replace(/\/$/, "");
    }
    return PRODUCTION_API_URL;
  }

  return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
}
