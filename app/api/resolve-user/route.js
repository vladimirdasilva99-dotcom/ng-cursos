import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const allowedUser = String(process.env.APP_LOGIN_USER ?? "").trim().toLowerCase();
  const email = String(process.env.APP_LOGIN_EMAIL ?? "").trim();

  if (!allowedUser || !email) {
    return NextResponse.json({ error: "login not configured" }, { status: 500 });
  }

  if (username !== allowedUser) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ email });
}
