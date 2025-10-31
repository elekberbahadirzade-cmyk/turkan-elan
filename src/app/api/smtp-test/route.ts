import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function bool(v?: string) {
  return v === "true" || v === "1" || v === "yes";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

async function verifyOnce(host: string, port: number, secure: boolean) {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { servername: host, rejectUnauthorized: true },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transporter.verify();
  return { ok: true };
}

type Attempt = {
  host: string;
  port: number;
  secure: boolean;
  error?: any;
};

export async function GET() {
  try {
    const host = process.env.SMTP_HOST || "";
    const port = Number(process.env.SMTP_PORT || "0");
    const secure = port === 465 || bool(process.env.SMTP_SECURE);

    if (!host || !port) {
      return NextResponse.json({ error: "SMTP_HOST/SMTP_PORT yoxdur" }, { status: 500 });
    }

    const attempts: Attempt[] = [];

    try {
      await verifyOnce(host, port, secure);
      return NextResponse.json({
        ok: true,
        tried: [{ host, port, secure }],
        note: "ENV dəyərləri ilə bağlantı uğurlu",
      });
    } catch (e1: any) {
      attempts.push({ host, port, secure, error: e1?.message });
    }

    const alt: Attempt = port === 465
      ? { host, port: 587, secure: false }
      : { host, port: 465, secure: true };

    try {
      await verifyOnce(alt.host, alt.port, alt.secure);
      return NextResponse.json({
        ok: true,
        tried: attempts.concat([alt]),
        note: "Fallback uğurlu",
      });
    } catch (e2: any) {
      attempts.push({ ...alt, error: e2?.message });
      return NextResponse.json({ ok: false, tried: attempts }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "smtp-test error" }, { status: 500 });
  }
}
