import { NextResponse } from "next/server";
import { deliverEmail, isEmailConfigured } from "@/lib/email-transport";
import { escapeHtml } from "@/lib/email-layout";
import { emailStyles } from "@/lib/email-layout";

const CONTACT_TO = "karamba@vera.com.uy";
const CONTACT_CC = "fkasmenko@gmail.com";

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_MESSAGE = 8000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildContactEmailHtml(opts: {
  name: string;
  email: string;
  message: string;
}): string {
  const { pageBg, cardBg, text, heading, border, muted } = emailStyles;
  const bodyHtml = escapeHtml(opts.message).replace(/\r\n|\r|\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:24px;background:${pageBg};font-family:Inter,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${cardBg};border-radius:16px;border:1px solid ${border};overflow:hidden;">
    <tr>
      <td style="padding:28px 28px 8px;">
        <h1 style="margin:0;font-size:18px;color:${heading};">Mensaje desde el sitio web</h1>
        <p style="margin:12px 0 0;font-size:13px;color:${muted};">Respondé usando &quot;Responder&quot; para escribirle a la persona directamente.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px;font-size:15px;line-height:1.55;color:${text};">
        <p style="margin:0 0 12px;"><strong>Nombre:</strong> ${escapeHtml(opts.name)}</p>
        <p style="margin:0 0 12px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(opts.email)}" style="color:#db2777;">${escapeHtml(opts.email)}</a></p>
        <p style="margin:16px 0 8px;"><strong>Mensaje</strong></p>
        <div style="margin:0;padding:14px 16px;background:#fdf2f8;border-radius:12px;border:1px solid ${border};">${bodyHtml}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const honeypot = typeof o._hp === "string" ? o._hp : "";
  if (honeypot.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const message = typeof o.message === "string" ? o.message.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Completá nombre, email y mensaje." },
      { status: 400 }
    );
  }

  if (name.length > MAX_NAME || email.length > MAX_EMAIL || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: "El texto es demasiado largo." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "El email no es válido." }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "El envío de correos no está configurado en el servidor. Contactanos por WhatsApp o email.",
      },
      { status: 503 }
    );
  }

  const subject = `[Karamba — Contacto] ${name.slice(0, 80)}`;
  const html = buildContactEmailHtml({ name, email, message });

  try {
    await deliverEmail(CONTACT_TO, subject, html, {
      cc: CONTACT_CC,
      replyTo: email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar.";
    console.error("[contact]", msg);
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje. Probá de nuevo más tarde." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
