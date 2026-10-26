export const PRODUCTION_API_URL =
  "https://mediacare-production.up.railway.app";

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * ლოკალურად: .env.local → NEXT_PUBLIC_API_URL=http://localhost:4001
 * Vercel/production: ყოველთვის Railway (localhost env იგნორდება)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (process.env.NODE_ENV === "production") {
    if (fromEnv && !isLocalhostUrl(fromEnv)) {
      return fromEnv.replace(/\/$/, "");
    }
    return PRODUCTION_API_URL;
  }

  return (fromEnv || "http://localhost:4001").replace(/\/$/, "");
}
