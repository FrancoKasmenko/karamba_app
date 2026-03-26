import { getBaseUrl } from "@/lib/base-url";
import { formatPrice } from "@/lib/utils";
import {
  emailBadge,
  emailCallout,
  emailP,
  emailShell,
  escapeHtml,
} from "@/lib/email-layout";

const SAMPLE_ORDER_ID = "clsample00000000000001";
const SAMPLE_COURSE_SLUG = "ejemplo-curso-online";

function orderShortId(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

export type EmailPreviewSample = {
  key: string;
  label: string;
  description: string;
  html: string;
};

/**
 * HTML de ejemplo para cada plantilla transaccional (misma estructura que email-events).
 * Útil para /previews-correos en el navegador.
 */
export function getEmailPreviewSamples(
  name = "Juan Pérez"
): EmailPreviewSample[] {
  const base = getBaseUrl().replace(/\/$/, "");
  const greet = escapeHtml(name);
  const short = orderShortId(SAMPLE_ORDER_ID);

  const productosUrl = `${base}/productos`;
  const perfilUrl = `${base}/perfil`;
  const loginUrl = `${base}/login`;
  const checkoutUrl = `${base}/checkout`;
  const resetUrl = `${base}/login/restablecer-contrasena?token=EJEMPLO_TOKEN`;
  const transferPage = `${base}/checkout/transferencia?orderId=${SAMPLE_ORDER_ID}`;
  const cursoUrl = `${base}/curso/${SAMPLE_COURSE_SLUG}/contenido`;
  const certUrl = `${base}/api/courses/certificate/ejemplo-curso-id`;

  const line1 = `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;color:#4b5563;">Cuaderno A5 tapa dura <span style="color:#9ca3af;">× 2</span></td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;font-weight:600;color:#831843;">${formatPrice(890 * 2)}</td>
  </tr>`;
  const line2 = `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;color:#4b5563;">Stickers celebración <span style="color:#9ca3af;">× 1</span></td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid #fce7f3;font-size:14px;font-weight:600;color:#831843;">${formatPrice(320)}</td>
  </tr>`;
  const sampleTotal = 890 * 2 + 320;

  return [
    {
      key: "welcome",
      label: "Bienvenida",
      description: "Tras registrarse en el sitio.",
      html: emailShell({
        documentTitle: "Bienvenida — Karamba (vista previa)",
        preheader: "Tu cuenta ya está lista",
        heading: "Bienvenido a Karamba",
        subtitle: "Nos encanta tenerte del otro lado.",
        bodyHtml: `
      ${emailP(`Hola ${greet},`)}
      ${emailP(
        `Ya podés <strong>explorar productos</strong>, armar tu carrito y acceder a <strong>tus pedidos y cursos</strong> desde tu perfil cuando quieras.`
      )}
      ${emailP(
        `Si necesitás ayuda en cualquier momento, <strong>estamos para ayudarte</strong>: escribinos a <a href="mailto:contacto@karamba.com.uy" style="color:#ec4899;font-weight:600;">contacto@karamba.com.uy</a>.`
      )}
    `,
        cta: { href: productosUrl, label: "Explorar productos" },
        fallbackUrl: productosUrl,
      }),
    },
    {
      key: "password-reset",
      label: "Restablecer contraseña",
      description: "Enlace para elegir nueva contraseña.",
      html: emailShell({
        documentTitle: "Restablecer contraseña — Karamba (vista previa)",
        preheader: "Enlace seguro válido por 1 hora",
        heading: "Restablecer contraseña",
        subtitle: "Te ayudamos a volver a entrar a tu cuenta.",
        bodyHtml: `
      ${emailP(`Hola ${greet},`)}
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
      }),
    },
    {
      key: "password-changed",
      label: "Contraseña actualizada",
      description: "Confirmación tras cambiar la contraseña.",
      html: emailShell({
        documentTitle: "Contraseña actualizada — Karamba (vista previa)",
        preheader: "Tu cuenta está protegida",
        heading: "Tu contraseña fue actualizada",
        subtitle: "Cambio registrado correctamente.",
        bodyHtml: `
      ${emailP(`Hola ${greet},`)}
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
      }),
    },
    {
      key: "order-created-mp",
      label: "Pedido recibido (Mercado Pago)",
      description: "Cliente pagó o va a pagar con MP.",
      html: emailShell({
        documentTitle: `Pedido #${short} — Karamba (vista previa)`,
        preheader: `Recibimos tu pedido #${short}`,
        heading: "Recibimos tu pedido",
        subtitle: "Gracias por confiar en Karamba.",
        bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${greet},`)}
      ${emailP(`Ya registramos tu pedido. Este es el resumen:`)}
      ${emailCallout(
        `Te avisaremos cuando <strong>se confirme el pago</strong>. Mientras tanto podés seguir el estado del pedido desde tu perfil.`,
        "lila"
      )}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 12px;">
        <tbody>${line1}${line2}</tbody>
      </table>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#831843;">Total: ${formatPrice(sampleTotal)}</p>
    `,
        cta: { href: perfilUrl, label: "Ver pedido" },
        fallbackUrl: perfilUrl,
      }),
    },
    {
      key: "order-created-transfer",
      label: "Pedido recibido (transferencia)",
      description: "Cliente eligió transferencia bancaria.",
      html: emailShell({
        documentTitle: `Pedido #${short} — Karamba (vista previa)`,
        preheader: `Recibimos tu pedido #${short}`,
        heading: "Recibimos tu pedido",
        subtitle: "Gracias por confiar en Karamba.",
        bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${greet},`)}
      ${emailP(`Ya registramos tu pedido. Este es el resumen:`)}
      ${emailCallout(
        `Elegiste <strong>transferencia</strong>. En tu pedido tenés los datos bancarios. Cuando pagues, <strong>subí el comprobante</strong> desde el enlace de tu pedido para que podamos confirmarlo.`,
        "amber"
      )}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 12px;">
        <tbody>${line1}${line2}</tbody>
      </table>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#831843;">Total: ${formatPrice(sampleTotal)}</p>
    `,
        cta: { href: perfilUrl, label: "Ver pedido" },
        fallbackUrl: perfilUrl,
      }),
    },
    {
      key: "order-paid-physical",
      label: "Pago confirmado (envío físico)",
      description: "Incluye productos que requieren envío o retiro.",
      html: emailShell({
        documentTitle: `Pago confirmado #${short} — Karamba (vista previa)`,
        preheader: "¡Listo! Tu pago fue confirmado",
        heading: "Pago confirmado",
        subtitle: "Todo salió bien con tu compra.",
        bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${greet},`)}
      ${emailP(
        `¡Genial! <strong>Confirmamos tu pago</strong> para el pedido <strong>#${short}</strong>.`
      )}
      ${emailCallout(
        `Estamos <strong>preparando tu pedido</strong>. Te iremos contando cuando salga o esté listo para retiro, según lo que hayas elegido.`,
        "lila"
      )}
    `,
        cta: { href: perfilUrl, label: "Ver mi compra" },
        fallbackUrl: perfilUrl,
      }),
    },
    {
      key: "order-paid-digital",
      label: "Pago confirmado (digital / online)",
      description: "Solo digitales u online; sin envío físico.",
      html: emailShell({
        documentTitle: `Pago confirmado #${short} — Karamba (vista previa)`,
        preheader: "¡Listo! Tu pago fue confirmado",
        heading: "Pago confirmado",
        subtitle: "Todo salió bien con tu compra.",
        bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${greet},`)}
      ${emailP(
        `¡Genial! <strong>Confirmamos tu pago</strong> para el pedido <strong>#${short}</strong>.`
      )}
      ${emailCallout(
        `Si compraste algo digital o un curso online, ya podés acceder desde <strong>Mi aprendizaje</strong> en tu cuenta.`,
        "celeste"
      )}
    `,
        cta: { href: perfilUrl, label: "Ver mi compra" },
        fallbackUrl: perfilUrl,
      }),
    },
    {
      key: "order-rejected",
      label: "Pago no acreditado / pedido cancelado",
      description: "Pago rechazado o orden cancelada antes de pagar.",
      html: emailShell({
        documentTitle: `Pago no acreditado #${short} — Karamba (vista previa)`,
        preheader: "Podés intentar de nuevo cuando quieras",
        heading: "Hubo un problema con tu pago",
        subtitle: "No te preocupes, suele tener solución.",
        bodyHtml: `
      ${emailBadge(`ORDEN #${short}`)}
      ${emailP(`Hola ${greet},`)}
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
      }),
    },
    {
      key: "transfer-reminder",
      label: "Recordatorio de transferencia",
      description: "Aviso para completar transferencia.",
      html: emailShell({
        documentTitle: `Recordatorio de pago #${short} — Karamba (vista previa)`,
        preheader: "Completá tu transferencia",
        heading: "Te recordamos tu pago",
        subtitle: `Pedido #${short}`,
        bodyHtml: `
      ${emailP(`Hola ${greet},`)}
      ${emailP(
        `Aún estamos esperando la transferencia de <strong>${formatPrice(sampleTotal)}</strong> por el pedido <strong>#${short}</strong>.`
      )}
      ${emailCallout(
        `<p style="margin:0 0 6px;font-weight:700;color:#831843;">Banco Ejemplo</p>
         <p style="margin:0 0 4px;font-size:14px;color:#4b5563;">Karamba SRL</p>
         <p style="margin:0;font-family:ui-monospace,monospace;font-size:14px;color:#374151;">001234567890</p>`,
        "amber"
      )}
      ${emailP(`Cuando pagues, subí el comprobante desde la página de tu pedido.`)}
    `,
        cta: { href: transferPage, label: "Ver datos del pedido" },
        fallbackUrl: transferPage,
      }),
    },
    {
      key: "course-access",
      label: "Acceso a curso online",
      description: "Tras confirmar compra del curso.",
      html: emailShell({
        documentTitle: `Tu curso — Karamba (vista previa)`,
        preheader: "Ilustración digital para principiantes",
        heading: "Tu curso ya está disponible",
        subtitle: "Entrá al aula cuando quieras.",
        bodyHtml: `
      ${emailP(`Hola ${greet},`)}
      ${emailP(
        `Confirmamos tu compra. Ya tenés acceso a <strong>Ilustración digital para principiantes</strong>.`
      )}
      ${emailP(`Desde el aula podés ver las clases a tu ritmo.`)}
    `,
        cta: { href: cursoUrl, label: "Entrar al aula" },
        fallbackUrl: cursoUrl,
      }),
    },
    {
      key: "course-completed",
      label: "Curso completado + certificado",
      description: "Al terminar el curso online.",
      html: emailShell({
        documentTitle: `Certificado — Karamba (vista previa)`,
        preheader: "Descargá tu certificado",
        heading: "¡Completaste el curso!",
        subtitle: "Un cierre hermoso para un gran aprendizaje.",
        bodyHtml: `
      ${emailP(`¡Felicitaciones, ${greet}!`)}
      ${emailP(
        `Terminaste <strong>Ilustración digital para principiantes</strong>. Podés descargar tu certificado en PDF cuando quieras (con tu sesión iniciada en Karamba).`
      )}
    `,
        cta: { href: certUrl, label: "Descargar certificado" },
        secondaryCta: { href: cursoUrl, label: "Volver al curso" },
        fallbackUrl: certUrl,
      }),
    },
  ];
}
