import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed: Record<string, string[]> = {
  "profile": ["GET", "PUT"],
  "memory": ["GET", "DELETE"],
  "ai/agent": ["POST"],
  "planner": ["POST"],
  "flights": ["POST"],
  "hotels": ["POST"],
  "auth/me": ["GET"],
  "bookings": ["GET"],
  "bookings/quote": ["POST"],
  "bookings/drafts": ["POST"],
  "payments/webhook": ["POST"],
};

function methodsFor(path: string): string[] {
  if (allowed[path]) return allowed[path];
  if (/^bookings\/[a-zA-Z0-9_-]{1,96}$/.test(path)) return ["GET"];
  if (/^bookings\/[a-zA-Z0-9_-]{1,96}\/(checkout|reserve)$/.test(path)) return ["POST"];
  return [];
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!methodsFor(path).includes(request.method)) {
    return NextResponse.json({ error: "Unknown endpoint or method." }, { status: 404 });
  }
  const webhook = path === "payments/webhook";
  // Stripe calls this endpoint directly; the backend verifies its signature.
  if (!webhook && request.method !== "GET" && !sameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Vacanes." }, { status: 403 });
  }
  const cookie = request.cookies.get("vacanes_session")?.value;
  const sid = cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cookie) ? cookie : randomUUID();
  const limit = webhook ? 1024 * 1024 : 30000;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  const body = ["POST", "PUT"].includes(request.method) ? Buffer.from(await request.arrayBuffer()) : undefined;
  if (body && body.byteLength > limit) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  try {
    const base = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.BACKEND_SERVICE_KEY ?? "",
    };
    if (webhook) {
      headers["Stripe-Signature"] = request.headers.get("stripe-signature") ?? "";
    } else {
      headers["X-Session-Id"] = sid;
      headers["X-Auth-Session"] = request.cookies.get("vacanes_auth")?.value ?? "";
    }
    const upstream = await fetch(`${base.replace(/\/$/, "")}/api/${path}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    if (!webhook) {
      response.cookies.set("vacanes_session", sid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 90 });
      if (upstream.status === 401 && request.cookies.has("vacanes_auth")) {
        response.cookies.set("vacanes_auth", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
      }
    }
    return response;
  } catch {
    return NextResponse.json({ error: "The travel service is unavailable. Start the Python backend and try again." }, { status: 503 });
  }
}

export { proxy as GET, proxy as PUT, proxy as POST, proxy as DELETE };
