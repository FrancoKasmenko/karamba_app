import { prisma } from "@/lib/prisma";
import { deliverEmail, isEmailConfigured } from "@/lib/email-transport";

export type SendEmailResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/**
 * Envío con deduplicación por (eventType, dedupeKey): no repite si ya hubo éxito.
 * `force` usa una clave nueva (reenvío admin).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  eventType: string;
  dedupeKey: string;
  force?: boolean;
}): Promise<SendEmailResult> {
  const dedupeKey = opts.force
    ? `${opts.dedupeKey}:force:${Date.now()}`
    : opts.dedupeKey;

  if (!isEmailConfigured()) {
    console.warn(
      `[EMAIL] Sin proveedor configurado — omitido (${opts.eventType} → ${opts.to})`
    );
    return { ok: true, skipped: true };
  }

  const existing = await prisma.emailLog.findUnique({
    where: {
      eventType_dedupeKey: {
        eventType: opts.eventType,
        dedupeKey,
      },
    },
  });

  if (existing?.success && !opts.force) {
    console.log(`[EMAIL] Dedupe (ya enviado): ${opts.eventType} ${dedupeKey}`);
    return { ok: true, skipped: true };
  }

  const row = await prisma.emailLog.upsert({
    where: {
      eventType_dedupeKey: {
        eventType: opts.eventType,
        dedupeKey,
      },
    },
    create: {
      toEmail: opts.to,
      eventType: opts.eventType,
      dedupeKey,
      subject: opts.subject,
      success: false,
    },
    update: {
      toEmail: opts.to,
      subject: opts.subject,
      success: false,
      error: null,
    },
  });

  if (row.success && !opts.force) {
    return { ok: true, skipped: true };
  }

  try {
    await deliverEmail(opts.to, opts.subject, opts.html);
    await prisma.emailLog.update({
      where: { id: row.id },
      data: { success: true, error: null },
    });
    console.log(`[EMAIL] OK ${opts.eventType} → ${opts.to}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.emailLog.update({
      where: { id: row.id },
      data: { success: false, error: msg },
    }).catch(() => {});
    console.error(`[EMAIL] Falló ${opts.eventType}:`, msg);
    return { ok: false, error: msg };
  }
}
