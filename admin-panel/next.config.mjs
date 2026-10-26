const PRODUCTION_API_URL = "https://mediacare-production.up.railway.app";

function resolveApiDestination() {
  const raw = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    PRODUCTION_API_URL
  )
    .trim()
    .replace(/\/$/, "");

  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) {
    return PRODUCTION_API_URL;
  }

  return raw;
}

const apiDestination = resolveApiDestination();

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: "",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiDestination}/:path*`,
      },
    ];
  },
};

export default nextConfig;
