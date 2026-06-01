export const PRODUCTION_API_URL =
  "https://mediacare-production.up.railway.app";

/** ლოკალურად: .env.local → NEXT_PUBLIC_API_URL=http://localhost:4001 */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:4001"
      : PRODUCTION_API_URL)
  );
}
