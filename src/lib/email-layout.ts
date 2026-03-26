import { getBaseUrl } from "@/lib/base-url";

/** Paleta Karamba: rosado + pasteles (emails = inline styles, sin Tailwind) */
export const emailStyles = {
  primary: "#ec4899",
  primaryDark: "#db2777",
  primarySoft: "#fce7f3",
  lilaSoft: "#f5f3ff",
  lilaBorder: "#ede9fe",
  celesteSoft: "#e0f2fe",
  celesteBorder: "#bae6fd",
  amberSoft: "#fffbeb",
  amberBorder: "#fde68a",
  amberText: "#92400e",
  pageBg: "#fff1f5",
  cardBg: "#ffffff",
  text: "#4b5563",
  heading: "#831843",
  muted: "#9ca3af",
  border: "#fce7f3",
  white: "#ffffff",
  footerRule: "#f3e8eb",
} as const;

const FONT =
  "Inter,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailLogoAbsoluteUrl(): string {
  const base = getBaseUrl().replace(/\/$/, "");
  return `${base}/no-image.png`;
}

export function emailHeader(): string {
  const logoSrc = emailLogoAbsoluteUrl();
  const { pageBg, primarySoft, lilaSoft, border } = emailStyles;
  return `
  <tr>
    <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(180deg,${pageBg} 0%,${primarySoft} 45%,${lilaSoft} 75%,${pageBg} 100%);border-radius:24px 24px 0 0;border-bottom:1px solid ${border};">
      <img src="${escapeHtml(logoSrc)}" width="160" alt="Karamba" style="display:block;margin:0 auto;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;" />
    </td>
  </tr>`;
}

export function emailButton(href: string, label: string): string {
  const { primary, white } = emailStyles;
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
  <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:14px 32px;background:${primary};color:${white};text-decoration:none;border-radius:9999px;font-weight:600;font-size:15px;line-height:1.25;font-family:${FONT};box-shadow:0 2px 8px rgba(236,72,153,0.25);">
    ${safeLabel}
  </a>`;
}

/** CTA secundario (contorno rosado) */
export function emailButtonSecondary(href: string, label: string): string {
  const { primary, primarySoft, heading } = emailStyles;
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
  <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:12px 28px;background:${primarySoft};color:${heading};text-decoration:none;border-radius:9999px;font-weight:600;font-size:14px;line-height:1.25;font-family:${FONT};border:1px solid rgba(236,72,153,0.35);">
    ${safeLabel}
  </a>`;
}

export function emailFallbackLink(url: string, linkText = "Abrí este enlace"): string {
  const { muted, primary } = emailStyles;
  const safeUrl = escapeHtml(url);
  const safeText = escapeHtml(linkText);
  return `
  <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:${muted};text-align:center;font-family:${FONT};">
    ¿No funciona el botón?<br/>
    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:${primary};font-weight:600;text-decoration:underline;">${safeText}</a>
  </p>`;
}

export function emailHeadingBlock(heading: string, subtitle?: string): string {
  const { heading: hColor, muted, text } = emailStyles;
  const sub = subtitle?.trim()
    ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:${muted};font-family:${FONT};">${escapeHtml(subtitle.trim())}</p>`
    : "";
  return `
  <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:${hColor};font-family:${FONT};letter-spacing:-0.02em;">
    ${escapeHtml(heading)}
  </h1>
  ${sub}`;
}

export function emailBadge(label: string): string {
  const { primarySoft, heading } = emailStyles;
  return `
  <span style="display:inline-block;margin:0 0 16px;padding:6px 14px;background:${primarySoft};color:${heading};font-size:12px;font-weight:700;border-radius:9999px;letter-spacing:0.04em;font-family:${FONT};">
    ${escapeHtml(label)}
  </span>`;
}

export function emailFooter(): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const host = base.replace(/^https?:\/\//, "");
  const { muted, primary, footerRule, text } = emailStyles;
  return `
  <tr>
    <td style="padding:28px 32px 32px;border-top:1px solid ${footerRule};text-align:center;background:${emailStyles.cardBg};border-radius:0 0 24px 24px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${emailStyles.heading};font-family:${FONT};">Karamba</p>
      <p style="margin:0 0 12px;font-size:13px;font-family:${FONT};">
        <a href="mailto:contacto@karamba.com.uy" style="color:${primary};text-decoration:none;font-weight:600;">contacto@karamba.com.uy</a>
      </p>
      <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${muted};font-family:${FONT};">
        Este es un correo automático. No hace falta responderlo.
      </p>
      <a href="${escapeHtml(base)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:${text};font-weight:600;text-decoration:underline;font-family:${FONT};">${escapeHtml(host)}</a>
    </td>
  </tr>`;
}

export type EmailShellOptions = {
  /** &lt;title&gt; del HTML */
  documentTitle: string;
  preheader?: string;
  heading: string;
  subtitle?: string;
  /** Bloque principal (párrafos, tablas, cajas) */
  bodyHtml: string;
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  fallbackUrl?: string;
};

/**
 * Plantilla base: logo, título, subtítulo, cuerpo, CTA, link alternativo, footer.
 * Compatible con clientes tipo Gmail (tablas + estilos inline).
 */
export function emailShell(opts: EmailShellOptions): string {
  const {
    documentTitle,
    preheader,
    heading,
    subtitle,
    bodyHtml,
    cta,
    secondaryCta,
    fallbackUrl,
  } = opts;

  const { pageBg, cardBg, text } = emailStyles;

  const ctaBlock =
    cta || secondaryCta
      ? `<tr><td style="padding:8px 32px 0;text-align:center;">
          ${
            cta
              ? `<div style="margin-bottom:${secondaryCta ? "14px" : "0"};">${emailButton(cta.href, cta.label)}</div>`
              : ""
          }
          ${
            secondaryCta
              ? `<div>${emailButtonSecondary(secondaryCta.href, secondaryCta.label)}</div>`
              : ""
          }
        </td></tr>`
      : "";

  const fallbackBlock = fallbackUrl
    ? `<tr><td style="padding:8px 32px 0;">${emailFallbackLink(fallbackUrl)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(documentTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${pageBg};font-family:${FONT};color:${text};-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${pageBg};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${cardBg};border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(131,24,67,0.08);border:1px solid rgba(252,231,243,0.9);">
          ${emailHeader()}
          <tr>
            <td style="padding:28px 32px 8px;">
              ${emailHeadingBlock(heading, subtitle)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;font-size:15px;line-height:1.6;color:${text};font-family:${FONT};">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          ${fallbackBlock}
          ${emailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Párrafo estándar */
export function emailP(html: string, extraStyle = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${emailStyles.text};font-family:${FONT};${extraStyle}">${html}</p>`;
}

/** Caja suave (info transferencia, avisos) */
export function emailCallout(
  innerHtml: string,
  variant: "amber" | "lila" | "celeste" = "lila"
): string {
  const map = {
    amber: {
      bg: emailStyles.amberSoft,
      border: emailStyles.amberBorder,
      color: emailStyles.amberText,
    },
    lila: {
      bg: emailStyles.lilaSoft,
      border: emailStyles.lilaBorder,
      color: emailStyles.heading,
    },
    celeste: {
      bg: emailStyles.celesteSoft,
      border: emailStyles.celesteBorder,
      color: "#0369a1",
    },
  } as const;
  const v = map[variant];
  return `
  <div style="margin:20px 0;padding:16px 18px;background:${v.bg};border:1px solid ${v.border};border-radius:16px;font-size:14px;line-height:1.55;color:${v.color};font-family:${FONT};">
    ${innerHtml}
  </div>`;
}
