import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    host: (req as any).headers.get("host"),
  });
}
