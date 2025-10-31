import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mask(v?: string) {
  if (!v) return "";
  if (v.length <= 6) return "***";
  return v.slice(0, 2) + "***" + v.slice(-2);
}

export async function GET() {
  const data = {
    SELF_BASE_URL: process.env.SELF_BASE_URL || "",
    ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO || "",
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: process.env.SMTP_PORT || "",
    SMTP_SECURE: process.env.SMTP_SECURE || "",
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_FROM: process.env.SMTP_FROM || "",
    SMTP_PASS_LEN: (process.env.SMTP_PASS || "").length,
    UPSTASH_REDIS_REST_URL: mask(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: mask(process.env.UPSTASH_REDIS_REST_TOKEN),
  };
  return NextResponse.json({ ok: true, env: data });
}
