import { Resend } from "resend";
import nodemailer from "nodemailer";

function getFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Karamba <onboarding@resend.dev>"
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim())
  );
}

/**
 * Entrega el correo (Resend prioridad, si no SMTP). Lanza si ambos fallan.
 */
export async function deliverEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const from = getFrom();

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (host && user && pass) {
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, html });
    return;
  }

  throw new Error(
    "Email no configurado: definí RESEND_API_KEY o SMTP_HOST + SMTP_USER + SMTP_PASS"
  );
}
