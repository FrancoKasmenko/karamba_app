import { getBaseUrl } from "@/lib/base-url";

const PRIMARY = "#e8637a";
const PRIMARY_DARK = "#c94d62";
const BG = "#fff8f9";
const TEXT = "#4a4a4a";
const MUTED = "#6b7280";

export function emailShell(opts: {
  title: string;
  preheader?: string;
  innerHtml: string;
}): string {
  const base = getBaseUrl();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(232,99,122,0.12);">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;background:linear-gradient(135deg,#fce4ec 0%,#fff5f7 50%,#e8f5f3 100%);">
              <div style="font-size:26px;font-weight:800;letter-spacing:0.06em;color:${PRIMARY};font-family:Georgia,'Times New Roman',serif;">Karamba</div>
              <div style="font-size:11px;color:${MUTED};margin-top:4px;">Papelería & celebración</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 32px;">
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f3e8eb;text-align:center;font-size:11px;color:${MUTED};">
              <a href="${base}" style="color:${PRIMARY};text-decoration:none;">${base.replace(/^https?:\/\//, "")}</a>
              <br/>Este mensaje fue enviado automáticamente.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const emailStyles = { PRIMARY, PRIMARY_DARK, TEXT, MUTED };
