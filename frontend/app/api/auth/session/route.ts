import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This request must come from Vacanes." }, { status: 403 });
  const text = await request.text();
  if (Buffer.byteLength(text) > 16000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let idToken: string;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.id_token !== "string" || !parsed.id_token || parsed.id_token.length > 12000) throw new Error();
    idToken = parsed.id_token;
  } catch {
    return NextResponse.json({ error: "A valid sign-in token is required." }, { status: 400 });
  }
  try {
    const base = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
    const upstream = await fetch(`${base.replace(/\/$/, "")}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Key": process.env.BACKEND_SERVICE_KEY ?? "" },
      body: JSON.stringify({ id_token: idToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ error: typeof data.detail === "string" ? data.detail : "Sign-in could not be verified. Please try again." }, { status: upstream.status });
    }
    if (typeof data.session_cookie !== "string" || !data.session_cookie || data.expires_in !== 432000 || typeof data.user?.uid !== "string") {
      return NextResponse.json({ error: "The sign-in service returned an invalid session." }, { status: 502 });
    }
    // The signed session stays in an HttpOnly cookie and never reaches client JavaScript.
    const response = NextResponse.json({ authenticated: true, user: data.user }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set("vacanes_auth", data.session_cookie, { ...cookieOptions, maxAge: data.expires_in });
    return response;
  } catch {
    return NextResponse.json({ error: "The sign-in service is unavailable. Start the backend and try again." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This request must come from Vacanes." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false, user: null }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("vacanes_auth", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
