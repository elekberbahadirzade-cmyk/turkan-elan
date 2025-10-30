import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, items, filters } = await req.json();

    if (!email || !Array.isArray(items)) {
      return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif">
        <h2>Türkan elanları</h2>
        <p><b>Filtrlər:</b> ${JSON.stringify(filters)}</p>
        <hr/>
        ${items
          .map(
            (x: any) => `
          <div style="margin:12px 0;padding:10px;border:1px solid #eee;border-radius:10px">
            <div style="display:flex;gap:12px;align-items:center">
              ${
                x.img
                  ? `<img src="${x.img}" style="width:96px;height:72px;object-fit:cover;border-radius:8px" />`
                  : ""
              }
              <div>
                <div><b>${x.title}</b> — ₼${x.price}</div>
                <div>${x.region} · ${x.source} · ${
              x.owner ? "Sahibindən" : "Makler"
            } · ${x.date || ""}</div>
                ${x.url ? `<a href="${x.url}">Orijinal elan</a>` : ""}
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Türkan — uyğun elanlar",
      html,
    });

    return NextResponse.json({ ok: true, message: "Mail göndərildi ✅" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Server xətası" },
      { status: 500 }
    );
  }
}
