import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { formatPrice } from "@/lib/utils";
import {
  emailButton,
  emailShell,
  emailStyles,
  escapeHtml,
} from "@/lib/email-layout";
import { sendTransactionalEmail } from "@/lib/email-send";

export const EmailEventType = {
  AUTH_WELCOME: "AUTH_WELCOME",
  AUTH_PASSWORD_RESET_REQUEST: "AUTH_PASSWORD_RESET_REQUEST",
  AUTH_PASSWORD_CHANGED: "AUTH_PASSWORD_CHANGED",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_PAID: "ORDER_PAID",
  ORDER_REJECTED: "ORDER_REJECTED",
  TRANSFER_REMINDER: "TRANSFER_REMINDER",
  COURSE_ACCESS: "COURSE_ACCESS",
  COURSE_COMPLETED: "COURSE_COMPLETED",
} as const;

function certUrl(courseId: string): string {
  return `${getBaseUrl()}/api/courses/certificate/${courseId}`;
}

export function fireAndForget(p: Promise<unknown>): void {
  void p.catch((e) => console.error("[EMAIL] fireAndForget:", e));
}

export async function notifyPasswordResetRequest(
  to: string,
  name: string | null,
  resetUrl: string,
  dedupeKey: string
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const html = emailShell({
    title: "Restablecer contraseña",
    preheader: "Enlace válido por 1 hora",
    innerHtml: `
      <p style="margin:0 0 16px;font-size:16px;">Hola ${escapeHtml(name || "")},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">Recibimos una solicitud para restablecer tu contraseña en <strong>Karamba</strong>. Si no fuiste vos, ignorá este mensaje.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(resetUrl, "Elegir nueva contraseña")}
      </div>
      <p style="margin:0;font-size:13px;color:${emailStyles.MUTED};">El enlace expira en 1 hora.</p>
    `,
  });

  const result = await sendTransactionalEmail({
    to,
    subject: "Karamba — Restablecer contraseña",
    html,
    eventType: EmailEventType.AUTH_PASSWORD_RESET_REQUEST,
    dedupeKey,
  });

  if (!result.ok) {
    console.error(
      "[EMAIL] notifyPasswordResetRequest falló:",
      "error" in result ? result.error : result
    );
    return { ok: false, error: "error" in result ? result.error : "unknown" };
  }
  if (result.skipped) {
    console.warn("[EMAIL] notifyPasswordResetRequest omitido (dedupe/sin proveedor)", {
      to,
      dedupeKey,
    });
    return { ok: true, skipped: true };
  }
  return { ok: true };
}

export async function notifyPasswordChangedEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const html = emailShell({
    title: "Contraseña actualizada",
    preheader: "Tu cuenta Karamba",
    innerHtml: `
      <p style="margin:0 0 16px;font-size:16px;">Hola ${escapeHtml(user.name || "")},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">La contraseña de tu cuenta fue modificada. Si no fuiste vos, contactanos de inmediato.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(`${getBaseUrl()}/login`, "Iniciar sesión")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: user.email,
    subject: "Karamba — Contraseña actualizada",
    html,
    eventType: EmailEventType.AUTH_PASSWORD_CHANGED,
    dedupeKey: `${userId}:${Math.floor(Date.now() / 1000)}`,
  });
}

export async function notifyWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const html = emailShell({
    title: "Bienvenida a Karamba",
    preheader: "Tu cuenta está lista",
    innerHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;">Hola ${escapeHtml(user.name || "")},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5c5c5c;">Gracias por registrarte en <strong>Karamba</strong>. Ya podés explorar la tienda y tus cursos.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(getBaseUrl(), "Ir al sitio")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: user.email,
    subject: "Bienvenida a Karamba",
    html,
    eventType: EmailEventType.AUTH_WELCOME,
    dedupeKey: userId,
  });
}

async function loadOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      transferAccount: true,
      items: {
        include: {
          product: {
            select: {
              isOnlineCourse: true,
              onlineCourseId: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function notifyOrderCreated(
  orderId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const order = await loadOrderForEmail(orderId);
  if (!order?.user?.email) return;

  const lines = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f3e8eb;">${escapeHtml(i.productName)} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #f3e8eb;">${formatPrice(i.price * i.quantity)}</td></tr>`
    )
    .join("");

  const transferNote =
    order.checkoutPaymentMethod === "BANK_TRANSFER"
      ? `<p style="font-size:14px;color:#92400e;background:#fffbeb;padding:12px 16px;border-radius:12px;">Te enviamos los datos para transferir. Cuando pagues, subí el comprobante desde el enlace de tu pedido.</p>`
      : "";

  const html = emailShell({
    title: "Pedido recibido",
    preheader: `Orden #${orderId.slice(-8).toUpperCase()}`,
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(order.user.name || "")},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Recibimos tu pedido <strong>#${orderId.slice(-8).toUpperCase()}</strong>.</p>
      ${transferNote}
      <table width="100%" style="border-collapse:collapse;margin:20px 0;font-size:14px;">${lines}</table>
      <p style="font-size:18px;font-weight:700;color:#e8637a;">Total: ${formatPrice(order.total)}</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(`${getBaseUrl()}/perfil`, "Ver mi pedido")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Pedido recibido #${orderId.slice(-8).toUpperCase()}`,
    html,
    eventType: EmailEventType.ORDER_CREATED,
    dedupeKey: orderId,
    force: opts?.force,
  });
}

export async function notifyOrderPaid(
  orderId: string,
  prevStatus: string,
  opts?: { force?: boolean }
): Promise<void> {
  const paidLike = ["PAID", "SHIPPED", "DELIVERED"];
  if (!opts?.force && paidLike.includes(prevStatus)) return;

  const order = await loadOrderForEmail(orderId);
  if (!order?.user?.email) return;

  const html = emailShell({
    title: "Pago confirmado",
    preheader: "Tu compra fue confirmada",
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(order.user.name || "")},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">¡Listo! <strong>Confirmamos el pago</strong> de tu pedido <strong>#${orderId.slice(-8).toUpperCase()}</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(`${getBaseUrl()}/perfil`, "Ver pedido")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Pago confirmado #${orderId.slice(-8).toUpperCase()}`,
    html,
    eventType: EmailEventType.ORDER_PAID,
    dedupeKey: orderId,
    force: opts?.force,
  });
}

export async function notifyOrderRejected(
  orderId: string,
  prevStatus: string,
  opts?: { force?: boolean }
): Promise<void> {
  if (!opts?.force && prevStatus === "CANCELLED") return;

  const order = await loadOrderForEmail(orderId);
  if (!order?.user?.email) return;

  const html = emailShell({
    title: "Pago no acreditado",
    preheader: "Actualización de tu pedido",
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(order.user.name || "")},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Tu pedido <strong>#${orderId.slice(-8).toUpperCase()}</strong> quedó <strong>cancelado</strong> o el pago no fue aprobado. Si creés que es un error, escribinos respondiendo este correo.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(getBaseUrl(), "Volver a la tienda")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Actualización pedido #${orderId.slice(-8).toUpperCase()}`,
    html,
    eventType: EmailEventType.ORDER_REJECTED,
    dedupeKey: orderId,
    force: opts?.force,
  });
}

export async function notifyCourseAccessGranted(
  orderId: string,
  onlineCourseId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const purchase = await prisma.userCoursePurchase.findFirst({
    where: { orderId, onlineCourseId },
    include: {
      user: { select: { email: true, name: true } },
      onlineCourse: { select: { title: true, slug: true } },
    },
  });
  if (!purchase?.user?.email) return;

  const href = `${getBaseUrl()}/curso/${purchase.onlineCourse.slug}/contenido`;
  const html = emailShell({
    title: "Tu curso está disponible",
    preheader: purchase.onlineCourse.title,
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(purchase.user.name || "")},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Tu compra fue confirmada. Ya tenés acceso a <strong>${escapeHtml(purchase.onlineCourse.title)}</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(href, "Entrar al aula")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: purchase.user.email,
    subject: `Karamba — Acceso a: ${purchase.onlineCourse.title}`,
    html,
    eventType: EmailEventType.COURSE_ACCESS,
    dedupeKey: `${orderId}:${onlineCourseId}`,
    force: opts?.force,
  });
}

export async function notifyCourseCompleted(
  userId: string,
  onlineCourseId: string
): Promise<void> {
  const row = await prisma.userCourse.findUnique({
    where: {
      userId_onlineCourseId: { userId, onlineCourseId },
    },
    include: {
      user: { select: { email: true, name: true } },
      onlineCourse: { select: { title: true, slug: true } },
    },
  });
  if (!row?.user?.email) return;

  const cUrl = certUrl(onlineCourseId);
  const html = emailShell({
    title: "¡Completaste el curso!",
    preheader: "Descargá tu certificado",
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">¡Felicitaciones ${escapeHtml(row.user.name || "")}!</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Completaste <strong>${escapeHtml(row.onlineCourse.title)}</strong>. Podés descargar tu certificado en PDF cuando quieras (iniciá sesión en Karamba).</p>
      <div style="text-align:center;margin:28px 0;">
        <div style="margin-bottom:14px;">${emailButton(cUrl, "Descargar certificado")}</div>
        <div>${emailButton(`${getBaseUrl()}/curso/${row.onlineCourse.slug}/contenido`, "Volver al curso")}</div>
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: row.user.email,
    subject: `Karamba — Certificado: ${row.onlineCourse.title}`,
    html,
    eventType: EmailEventType.COURSE_COMPLETED,
    dedupeKey: `${userId}:${onlineCourseId}`,
  });
}

export async function notifyTransferReminder(
  orderId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const order = await loadOrderForEmail(orderId);
  if (!order?.user?.email) return;
  if (order.checkoutPaymentMethod !== "BANK_TRANSFER") return;

  const acc = order.transferAccount;

  const bank = acc
    ? `<p style="font-size:14px;background:#f9fafb;padding:14px;border-radius:12px;"><strong>${escapeHtml(acc.bankName)}</strong><br/>${escapeHtml(acc.holderName)}<br/><span style="font-family:monospace">${escapeHtml(acc.accountNumber)}</span></p>`
    : "";

  const html = emailShell({
    title: "Recordatorio de pago",
    preheader: "Completá tu transferencia",
    innerHtml: `
      <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(order.user.name || "")},</p>
      <p style="margin:0 0 16px;font-size:15px;">Te recordamos completar el pago de tu pedido <strong>#${orderId.slice(-8).toUpperCase()}</strong> (${formatPrice(order.total)}).</p>
      ${bank}
      <div style="text-align:center;margin:28px 0;">
        ${emailButton(`${getBaseUrl()}/checkout/transferencia?orderId=${orderId}`, "Ver datos del pedido")}
      </div>
    `,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Recordatorio de pago #${orderId.slice(-8).toUpperCase()}`,
    html,
    eventType: EmailEventType.TRANSFER_REMINDER,
    dedupeKey: opts?.force
      ? `${orderId}:manual:${Date.now()}`
      : `${orderId}:${Math.floor(Date.now() / 86400000)}`,
    force: opts?.force,
  });
}

/** Tras marcar pago / webhook: emails según transición de estado */
export async function handleOrderStatusChangeEmails(
  orderId: string,
  previousStatus: string,
  newStatus: string
): Promise<void> {
  const paidLike = ["PAID", "SHIPPED", "DELIVERED"];

  if (paidLike.includes(newStatus) && !paidLike.includes(previousStatus)) {
    await notifyOrderPaid(orderId, previousStatus);
  }

  if (newStatus === "CANCELLED" && previousStatus !== "CANCELLED") {
    const wasPaid = paidLike.includes(previousStatus);
    if (!wasPaid) {
      await notifyOrderRejected(orderId, previousStatus);
    }
  }
}
