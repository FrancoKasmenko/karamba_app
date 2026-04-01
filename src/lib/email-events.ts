import { createHash } from "node:crypto";
import type { CheckoutPaymentMethod, OrderSource, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { api } from "@/lib/public-api";
import { formatPrice } from "@/lib/utils";
import {
  emailBadge,
  emailCallout,
  emailP,
  emailShell,
  escapeHtml,
} from "@/lib/email-layout";
import { sendTransactionalEmail } from "@/lib/email-send";

export const EmailEventType = {
  AUTH_WELCOME: "AUTH_WELCOME",
  AUTH_PASSWORD_RESET_REQUEST: "AUTH_PASSWORD_RESET_REQUEST",
  AUTH_PASSWORD_CHANGED: "AUTH_PASSWORD_CHANGED",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_STAFF_NEW: "ORDER_STAFF_NEW",
  ORDER_PAID: "ORDER_PAID",
  ORDER_REJECTED: "ORDER_REJECTED",
  TRANSFER_REMINDER: "TRANSFER_REMINDER",
  COURSE_ACCESS: "COURSE_ACCESS",
  COURSE_COMPLETED: "COURSE_COMPLETED",
} as const;

/** Destinatarios internos: aviso de cada pedido nuevo (pendiente o ya pagado). Sobrescribible con STAFF_ORDER_NOTIFY_EMAILS (correos separados por coma). */
const DEFAULT_STAFF_ORDER_NOTIFY_EMAILS = [
  "fkasmenko@gmail.com",
  "karamba@vera.com.uy",
  "kemko29@gmail.com",
  "somoskarambatv@gmail.com",
] as const;

function staffOrderNotifyRecipients(): string[] {
  const raw = process.env.STAFF_ORDER_NOTIFY_EMAILS?.trim();
  if (!raw) {
    return [...DEFAULT_STAFF_ORDER_NOTIFY_EMAILS];
  }
  const parsed = raw
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 3 && e.includes("@"));
  return parsed.length > 0 ? parsed : [...DEFAULT_STAFF_ORDER_NOTIFY_EMAILS];
}

function orderStatusLabelStaff(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING: "Pendiente de pago",
    PROCESSING: "Procesando",
    PAID: "Pagado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
}

function checkoutPaymentMethodLabel(m: CheckoutPaymentMethod): string {
  const map: Record<CheckoutPaymentMethod, string> = {
    MERCADOPAGO: "Mercado Pago",
    BANK_TRANSFER: "Transferencia bancaria",
    PAYPAL: "PayPal",
  };
  return map[m] ?? m;
}

function orderSourceLabel(source: OrderSource): string {
  const map: Record<OrderSource, string> = {
    PRODUCT: "Tienda",
    COURSE: "Curso presencial",
  };
  return map[source] ?? source;
}

function certUrl(courseId: string): string {
  return `${getBaseUrl()}${api(`/api/courses/certificate/${courseId}`)}`;
}

function orderShortId(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
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
  const greet = name?.trim()
    ? `Hola ${escapeHtml(name.trim())},`
    : "Hola,";

  const html = emailShell({
    documentTitle: "Restablecer contraseña — Karamba",
    preheader: "Enlace seguro válido por 1 hora",
    heading: "Restablecer contraseña",
    subtitle: "Te ayudamos a volver a entrar a tu cuenta.",
    bodyHtml: `
      ${emailP(`${greet}`)}
      ${emailP(
        `Recibimos un pedido para <strong>restablecer tu contraseña</strong> en Karamba. Si fuiste vos, tocá el botón de abajo y elegí una contraseña nueva.`
      )}
      ${emailCallout(
        `<strong>Si no pediste este cambio</strong>, podés ignorar este correo: tu contraseña sigue igual.`,
        "celeste"
      )}
      ${emailP(`El enlace vence en <strong>1 hora</strong> por seguridad.`, "margin-bottom:8px;")}
    `,
    cta: { href: resetUrl, label: "Crear nueva contraseña" },
    fallbackUrl: resetUrl,
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
    console.warn(
      "[EMAIL] notifyPasswordResetRequest omitido (dedupe/sin proveedor)",
      { to, dedupeKey }
    );
    return { ok: true, skipped: true };
  }
  return { ok: true };
}

export async function notifyPasswordResetEmail(
  userId: string,
  rawToken: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");
  const resetUrl = `${getBaseUrl()}/login/restablecer-contrasena?token=${encodeURIComponent(rawToken)}`;
  const dedupeKey = `pwreset:${tokenHash}`;

  const result = await notifyPasswordResetRequest(
    user.email,
    user.name,
    resetUrl,
    dedupeKey
  );

  if (!result.ok) {
    console.error("[EMAIL] notifyPasswordResetEmail falló:", result.error);
  }
}

export async function notifyPasswordChangedEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const loginUrl = `${getBaseUrl()}/login`;
  const html = emailShell({
    documentTitle: "Contraseña actualizada — Karamba",
    preheader: "Tu cuenta está protegida",
    heading: "Tu contraseña fue actualizada",
    subtitle: "Cambio registrado correctamente.",
    bodyHtml: `
      ${emailP(`Hola ${escapeHtml(user.name?.trim() || "ahí")},`)}
      ${emailP(
        `La contraseña de tu cuenta Karamba se modificó. Si fuiste vos, no tenés que hacer nada más.`
      )}
      ${emailCallout(
        `<strong>¿No reconocés este cambio?</strong> Escribinos a <a href="mailto:contacto@karamba.com.uy" style="color:#0369a1;">contacto@karamba.com.uy</a> cuanto antes.`,
        "celeste"
      )}
    `,
    cta: { href: loginUrl, label: "Iniciar sesión" },
    fallbackUrl: loginUrl,
  });

  await sendTransactionalEmail({
    to: user.email,
    subject: "Karamba — Contraseña actualizada",
    html,
    eventType: EmailEventType.AUTH_PASSWORD_CHANGED,
    dedupeKey: `${userId}:${Math.floor(Date.now() / 1000)}`,
  });
}

async function welcomeCouponCalloutHtml(): Promise<string> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "main" },
    select: { welcomeCouponCode: true },
  });
  const raw = settings?.welcomeCouponCode?.trim();
  if (!raw) return "";
  const code = raw.toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      active: true,
      description: true,
      minPurchaseAmount: true,
      maxDiscountAmount: true,
    },
  });
  if (!coupon?.active) return "";
  const extra = coupon.description?.trim()
    ? ` ${escapeHtml(coupon.description.trim())}`
    : "";
  const hints: string[] = [];
  if (coupon.minPurchaseAmount != null && coupon.minPurchaseAmount > 0) {
    hints.push(`Compra mínima ${formatPrice(coupon.minPurchaseAmount)}.`);
  }
  if (coupon.maxDiscountAmount != null && coupon.maxDiscountAmount > 0) {
    hints.push(`Descuento máximo ${formatPrice(coupon.maxDiscountAmount)}.`);
  }
  const hintHtml = hints.length ? ` ${escapeHtml(hints.join(" "))}` : "";
  return emailCallout(
    `<strong>Regalo por ser cliente nuevo:</strong> en tu primera compra podés usar el cupón <span style="font-family:ui-monospace,monospace;font-size:15px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(code)}</span> en el checkout.${extra}${hintHtml}`,
    "mint"
  );
}

export async function notifyWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const couponHtml = await welcomeCouponCalloutHtml();

  const base = getBaseUrl();
  const productosUrl = `${base}/productos`;
  const html = emailShell({
    documentTitle: "Bienvenida — Karamba",
    preheader: couponHtml
      ? "Tenés un cupón de bienvenida"
      : "Tu cuenta ya está lista",
    heading: "Bienvenido a Karamba",
    subtitle: "Nos encanta tenerte del otro lado.",
    bodyHtml: `
      ${emailP(`Hola ${escapeHtml(user.name?.trim() || "ahí")},`)}
      ${emailP(
        `Ya podés <strong>explorar productos</strong>, armar tu carrito y acceder a <strong>tus pedidos y cursos</strong> desde tu perfil cuando quieras.`
      )}
      ${couponHtml}
      ${emailP(
        `Si necesitás ayuda en cualquier momento, <strong>estamos para ayudarte</strong>: escribinos a <a href="mailto:contacto@karamba.com.uy" style="color:#ec4899;font-weight:600;">contacto@karamba.com.uy</a>.`
      )}
    `,
    cta: { href: productosUrl, label: "Explorar productos" },
    fallbackUrl: productosUrl,
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
              isDigital: true,
              onlineCourseId: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

function orderHasPhysicalItems(
  order: NonNullable<Awaited<ReturnType<typeof loadOrderForEmail>>>
): boolean {
  return order.items.some((i) => {
    const p = i.product;
    if (!p) return true;
    return !p.isDigital && !p.isOnlineCourse;
  });
}

function orderLinesTableHtml(
  order: NonNullable<Awaited<ReturnType<typeof loadOrderForEmail>>>
): string {
  return order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;color:#4b5563;">${escapeHtml(i.productName)} <span style="color:#9ca3af;">× ${i.quantity}</span></td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;font-weight:600;color:#831843;">${formatPrice(i.price * i.quantity)}</td>
        </tr>`
    )
    .join("");
}

/** Aviso interno: cada compra registrada en la web (pendiente o ya pagada). */
export async function notifyStaffOrderPlaced(
  orderId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const order = await loadOrderForEmail(orderId);
  if (!order) return;

  const recipients = staffOrderNotifyRecipients();
  if (recipients.length === 0) return;

  const short = orderShortId(orderId);
  const statusLabel = orderStatusLabelStaff(order.status);
  const adminUrl = `${getBaseUrl()}${api(`/admin/ordenes/${orderId}`)}`;
  const customerName =
    order.shippingName?.trim() || order.user?.name?.trim() || "—";
  const customerEmail = order.user?.email?.trim() || "—";
  const lines = orderLinesTableHtml(order);
  const shipBits = [
    order.shippingAddress?.trim(),
    order.shippingCity?.trim(),
    order.shippingPhone?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  const html = emailShell({
    documentTitle: `Nuevo pedido #${short} — Karamba`,
    preheader: `${statusLabel} · ${formatPrice(order.total)}`,
    heading: "Nuevo pedido en la web",
    subtitle: "Resumen para el equipo",
    bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`<strong>Estado:</strong> ${escapeHtml(statusLabel)}`)}
      ${emailP(`<strong>Origen:</strong> ${escapeHtml(orderSourceLabel(order.source))}`)}
      ${emailP(`<strong>Método de pago (checkout):</strong> ${escapeHtml(checkoutPaymentMethodLabel(order.checkoutPaymentMethod))}`)}
      ${emailP(`<strong>Cliente:</strong> ${escapeHtml(customerName)}`)}
      ${emailP(`<strong>Email cuenta:</strong> ${escapeHtml(customerEmail)}`)}
      ${
        shipBits
          ? emailP(`<strong>Envío / contacto:</strong> ${escapeHtml(shipBits)}`)
          : ""
      }
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 12px;">
        <tbody>${lines}</tbody>
      </table>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#831843;">Total: ${formatPrice(order.total)}</p>
    `,
    cta: { href: adminUrl, label: "Ver en administración" },
    fallbackUrl: adminUrl,
  });

  await Promise.all(
    recipients.map((to) =>
      sendTransactionalEmail({
        to,
        subject: `Karamba — Nuevo pedido #${short} (${statusLabel})`,
        html,
        eventType: EmailEventType.ORDER_STAFF_NEW,
        dedupeKey: `${orderId}:${to}`,
        force: opts?.force,
      })
    )
  );
}

export async function notifyOrderCreated(
  orderId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const order = await loadOrderForEmail(orderId);
  if (!order) return;

  const short = orderShortId(orderId);
  const lines = orderLinesTableHtml(order);

  if (order.user?.email) {
    const transferNote =
      order.checkoutPaymentMethod === "BANK_TRANSFER"
        ? emailCallout(
            `Elegiste <strong>transferencia</strong>. En tu pedido tenés los datos bancarios. Cuando pagues, <strong>subí el comprobante</strong> desde el enlace de tu pedido para que podamos confirmarlo.`,
            "amber"
          )
        : emailCallout(
            `Te avisaremos cuando <strong>se confirme el pago</strong>. Mientras tanto podés seguir el estado del pedido desde tu perfil.`,
            "lila"
          );

    const perfilUrl = `${getBaseUrl()}/perfil`;
    const html = emailShell({
      documentTitle: `Pedido #${short} — Karamba`,
      preheader: `Recibimos tu pedido #${short}`,
      heading: "Recibimos tu pedido",
      subtitle: "Gracias por confiar en Karamba.",
      bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${escapeHtml(order.user.name?.trim() || "ahí")},`)}
      ${emailP(`Ya registramos tu pedido. Este es el resumen:`)}
      ${transferNote}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 12px;">
        <tbody>${lines}</tbody>
      </table>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#831843;">Total: ${formatPrice(order.total)}</p>
    `,
      cta: { href: perfilUrl, label: "Ver pedido" },
      fallbackUrl: perfilUrl,
    });

    await sendTransactionalEmail({
      to: order.user.email,
      subject: `Karamba — Pedido recibido #${short}`,
      html,
      eventType: EmailEventType.ORDER_CREATED,
      dedupeKey: orderId,
      force: opts?.force,
    });
  }

  await notifyStaffOrderPlaced(orderId, opts);
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

  const short = orderShortId(orderId);
  const perfilUrl = `${getBaseUrl()}/perfil`;
  const physical = orderHasPhysicalItems(order);

  const shipNote = physical
    ? emailCallout(
        `Estamos <strong>preparando tu pedido</strong>. Te iremos contando cuando salga o esté listo para retiro, según lo que hayas elegido.`,
        "lila"
      )
    : emailCallout(
        `Si compraste algo digital o un curso online, ya podés acceder desde <strong>Mi aprendizaje</strong> en tu cuenta.`,
        "celeste"
      );

  const html = emailShell({
    documentTitle: `Pago confirmado #${short} — Karamba`,
    preheader: "¡Listo! Tu pago fue confirmado",
    heading: "Pago confirmado",
    subtitle: "Todo salió bien con tu compra.",
    bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${escapeHtml(order.user.name?.trim() || "ahí")},`)}
      ${emailP(
        `¡Genial! <strong>Confirmamos tu pago</strong> para el pedido <strong>#${short}</strong>.`
      )}
      ${shipNote}
    `,
    cta: { href: perfilUrl, label: "Ver mi compra" },
    fallbackUrl: perfilUrl,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Pago confirmado #${short}`,
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

  const short = orderShortId(orderId);
  const checkoutUrl = `${getBaseUrl()}/checkout`;
  const productosUrl = `${getBaseUrl()}/productos`;

  const html = emailShell({
    documentTitle: `Pago no acreditado #${short} — Karamba`,
    preheader: "Podés intentar de nuevo cuando quieras",
    heading: "Hubo un problema con tu pago",
    subtitle: "No te preocupes, suele tener solución.",
    bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${escapeHtml(order.user.name?.trim() || "ahí")},`)}
      ${emailP(
        `El pedido <strong>#${short}</strong> quedó <strong>cancelado</strong> o el pago no se acreditó. Podés volver a intentarlo con <strong>otra tarjeta o método</strong>.`
      )}
      ${emailCallout(
        `Si crees que es un error, respondé este correo o escribinos a <a href="mailto:contacto@karamba.com.uy" style="color:#92400e;font-weight:600;">contacto@karamba.com.uy</a>.`,
        "amber"
      )}
    `,
    cta: { href: checkoutUrl, label: "Reintentar pago" },
    secondaryCta: { href: productosUrl, label: "Ver productos" },
    fallbackUrl: checkoutUrl,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Actualización de tu pedido #${short}`,
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
    documentTitle: `Tu curso — Karamba`,
    preheader: purchase.onlineCourse.title,
    heading: "Tu curso ya está disponible",
    subtitle: "Entrá al aula cuando quieras.",
    bodyHtml: `
      ${emailP(`Hola ${escapeHtml(purchase.user.name?.trim() || "ahí")},`)}
      ${emailP(
        `Confirmamos tu compra. Ya tenés acceso a <strong>${escapeHtml(purchase.onlineCourse.title)}</strong>.`
      )}
      ${emailP(`Desde el aula podés ver las clases a tu ritmo.`)}
    `,
    cta: { href, label: "Entrar al aula" },
    fallbackUrl: href,
  });

  await sendTransactionalEmail({
    to: purchase.user.email,
    subject: `Karamba — Acceso: ${purchase.onlineCourse.title}`,
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
  const cursoUrl = `${getBaseUrl()}/curso/${row.onlineCourse.slug}/contenido`;

  const html = emailShell({
    documentTitle: `Certificado — Karamba`,
    preheader: "Descargá tu certificado",
    heading: "¡Completaste el curso!",
    subtitle: "Un cierre hermoso para un gran aprendizaje.",
    bodyHtml: `
      ${emailP(
        row.user.name?.trim()
          ? `¡Felicitaciones, ${escapeHtml(row.user.name.trim())}!`
          : "¡Felicitaciones!"
      )}
      ${emailP(
        `Terminaste <strong>${escapeHtml(row.onlineCourse.title)}</strong>. Podés descargar tu certificado en PDF cuando quieras (con tu sesión iniciada en Karamba).`
      )}
    `,
    cta: { href: cUrl, label: "Descargar certificado" },
    secondaryCta: { href: cursoUrl, label: "Volver al curso" },
    fallbackUrl: cUrl,
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
  const short = orderShortId(orderId);

  const bank = acc
    ? `<p style="margin:0 0 6px;font-weight:700;color:#831843;">${escapeHtml(acc.bankName)}</p>
       <p style="margin:0 0 4px;font-size:14px;color:#4b5563;">${escapeHtml(acc.holderName)}</p>
       <p style="margin:0;font-family:ui-monospace,monospace;font-size:14px;color:#374151;">${escapeHtml(acc.accountNumber)}</p>`
    : "<p style='margin:0;color:#6b7280;'>Consultá los datos en tu pedido en el sitio.</p>";

  const transferPage = `${getBaseUrl()}/checkout/transferencia?orderId=${orderId}`;

  const html = emailShell({
    documentTitle: `Recordatorio de pago #${short} — Karamba`,
    preheader: "Completá tu transferencia",
    heading: "Te recordamos tu pago",
    subtitle: `Pedido #${short}`,
    bodyHtml: `
      ${emailP(`Hola ${escapeHtml(order.user.name?.trim() || "ahí")},`)}
      ${emailP(
        `Aún estamos esperando la transferencia de <strong>${formatPrice(order.total)}</strong> por el pedido <strong>#${short}</strong>.`
      )}
      ${emailCallout(bank, "amber")}
      ${emailP(`Cuando pagues, subí el comprobante desde la página de tu pedido.`)}
    `,
    cta: { href: transferPage, label: "Ver datos del pedido" },
    fallbackUrl: transferPage,
  });

  await sendTransactionalEmail({
    to: order.user.email,
    subject: `Karamba — Recordatorio de pago #${short}`,
    html,
    eventType: EmailEventType.TRANSFER_REMINDER,
    dedupeKey: opts?.force
      ? `${orderId}:manual:${Date.now()}`
      : `${orderId}:${Math.floor(Date.now() / 86400000)}`,
    force: opts?.force,
  });
}

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
