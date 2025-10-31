    import { NextResponse } from "next/server";
    import nodemailer from "nodemailer";

    type Source = "bina" | "tap";
    interface Item {
      id: string; title: string; price: number; region: string;
      owner: boolean; source: Source; url: string; img?: string; date?: string;
    }
    interface Payload { email: string; filters: any; items: Item[]; }

    function bool(v?: string) { return v === "true" || v === "1" || v === "yes"; }

    function makeHtml(items: Item[], filters: any) {
      let rows = "";
      for (const x of items) {
        rows += `<tr>
<td style="padding:8px;border:1px solid #eee;">${x.title ?? ""}</td>
<td style="padding:8px;border:1px solid #eee;">${x.region ?? ""}</td>
<td style="padding:8px;border:1px solid #eee;">${x.owner ? "Sahibindən" : "Makler"}</td>
<td style="padding:8px;border:1px solid #eee;">${x.source}</td>
<td style="padding:8px;border:1px solid #eee;">₼${Number(x.price || 0)}</td>
<td style="padding:8px;border:1px solid #eee;"><a href="${x.url}" target="_blank" rel="noreferrer">Keçid</a></td>
</tr>`;
      }
      const filtersPretty = typeof filters === "string" ? filters : JSON.stringify(filters ?? {}, null, 2);
      return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
<h2>Torpaq elanları (${items.length})</h2>
<pre style="background:#fafafa;border:1px solid #eee;padding:10px;border-radius:6px;white-space:pre-wrap;">${filtersPretty}</pre>
<table style="border-collapse:collapse;width:100%;font-size:14px;">
<thead><tr>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Başlıq</th>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Ərazi</th>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Tip</th>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Mənbə</th>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Qiymət</th>
<th style="padding:8px;border:1px solid #eee;text-align:left;">Link</th>
</tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    export const dynamic = "force-dynamic";
    export const revalidate = 0;
    export const runtime = "nodejs";

    async function trySend({ host, port, secure, from, to, html }:
      { host: string; port: number; secure: boolean; from: string; to: string; html: string; }) {
      const user = process.env.SMTP_USER || "";
      const pass = process.env.SMTP_PASS || "";
      const transporter = nodemailer.createTransport({
        host, port, secure,
        auth: { user, pass },
        tls: { servername: host, rejectUnauthorized: true },
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
      await transporter.verify();
      await transporter.sendMail({ from, to, subject: "Torpaq elanları", html });
    }

    export async function POST(req: Request) {
      try {
        const body = (await req.json()) as Payload;
        if (!body?.email) return NextResponse.json({ error: "Email tələb olunur" }, { status: 400 });
        if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: "Göndəriləcək elementlər boşdur" }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: "Düzgün e-poçt daxil edin" }, { status: 400 });

        const host = process.env.SMTP_HOST || "";
        const portEnv = Number(process.env.SMTP_PORT || "0");
        const from = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
        if (!host || !portEnv || !from || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          return NextResponse.json({ error: "SMTP ENV natamamdır (HOST/PORT/USER/PASS/FROM)" }, { status: 500 });
        }

        const preferred = { host, port: portEnv, secure: portEnv === 465 || bool(process.env.SMTP_SECURE) };
        const fallback = preferred.port == 465 ? { host, port: 587, secure: false } : { host, port: 465, secure: true };
        const html = makeHtml(body.items, body.filters);

        try {
          await trySend({ ...preferred, from, to: body.email, html });
          return NextResponse.json({ ok: true, via: preferred });
        } catch (e1: any) {
          try {
            await trySend({ ...fallback, from, to: body.email, html });
            return NextResponse.json({ ok: true, via: fallback, firstError: e1?.message });
          } catch (e2: any) {
            return NextResponse.json({ error: "SMTP bağlantısı alınmadı", tried: [{ ...preferred, error: e1?.message }, { ...fallback, error: e2?.message }] }, { status: 500 });
          }
        }
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Göndəriş xətası" }, { status: 500 });
      }
    }
