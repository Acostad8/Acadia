import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  return NextResponse.json({ publicKey: key ?? null });
}
