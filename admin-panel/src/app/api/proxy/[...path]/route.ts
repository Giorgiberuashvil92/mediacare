import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel same-origin proxy → Railway (avoids browser CORS / bad localhost env). */
const PRODUCTION_API_URL = "https://mediacare-production.up.railway.app";

function getUpstreamBase(): string {
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

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetPath = (path || []).join("/");
  const upstreamBase = getUpstreamBase();
  const incoming = new URL(req.url);
  const targetUrl = `${upstreamBase}/${targetPath}${incoming.search}`;

  const headers = new Headers();
  for (const name of [
    "content-type",
    "authorization",
    "accept",
    "accept-language",
  ] as const) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/proxy compat] upstream failed:", targetUrl, message);
    return NextResponse.json(
      {
        success: false,
        message: `Cannot reach backend (${upstreamBase}). ${message}`,
      },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
