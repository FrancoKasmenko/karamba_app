import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { loadCertificateLogoBytes } from "@/lib/brand-logo";

const ROSE = rgb(0.91, 0.39, 0.48);
const ROSE_LIGHT = rgb(0.99, 0.89, 0.93);
const MINT = rgb(0.88, 0.96, 0.94);
const TEXT = rgb(0.29, 0.29, 0.29);
const SUB = rgb(0.45, 0.45, 0.45);

export async function buildCourseCertificatePdf(opts: {
  userDisplayName: string;
  courseTitle: string;
  completedAt: Date;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 842,
    height: 595,
    color: ROSE_LIGHT,
  });

  page.drawRectangle({
    x: 36,
    y: 36,
    width: 842 - 72,
    height: 595 - 72,
    borderColor: ROSE,
    borderWidth: 2,
    color: rgb(1, 1, 1),
    opacity: 0.92,
  });

  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let logoDrawn = false;
  let imageBottomY = 0;

  const loaded = await loadCertificateLogoBytes();
  if (loaded) {
    try {
      const embedded =
        loaded.kind === "png"
          ? await pdf.embedPng(loaded.bytes)
          : await pdf.embedJpg(loaded.bytes);
      const maxW = 200;
      const scale = maxW / embedded.width;
      const h = embedded.height * scale;
      const x = 842 / 2 - maxW / 2;
      imageBottomY = 595 - 72 - h - 16;
      page.drawImage(embedded, {
        x,
        y: imageBottomY,
        width: maxW,
        height: h,
      });
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }

  let certSubtitleY: number;
  if (logoDrawn) {
    certSubtitleY = imageBottomY - 20;
  } else {
    const brandY = 595 - 72 - 40;
    page.drawText("KARAMBA", {
      x: 842 / 2 - fontBold.widthOfTextAtSize("KARAMBA", 28) / 2,
      y: brandY,
      size: 28,
      font: fontBold,
      color: ROSE,
    });
    certSubtitleY = brandY - 36;
  }

  page.drawText("Certificado de finalización", {
    x:
      842 / 2 -
      font.widthOfTextAtSize("Certificado de finalización", 14) / 2,
    y: certSubtitleY,
    size: 14,
    font,
    color: SUB,
  });

  const body =
    "Certificamos que la persona aquí nominada completó satisfactoriamente el curso indicado, " +
    "habiendo cumplido con todos los módulos y actividades requeridas en la plataforma Karamba.";

  const margin = 96;
  const wrap = (text: string, maxW: number, size: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  let y = certSubtitleY - 44;
  for (const ln of wrap(body, 842 - margin * 2, 11)) {
    page.drawText(ln, { x: margin, y, size: 11, font, color: TEXT });
    y -= 16;
  }

  y -= 24;
  page.drawText(opts.userDisplayName.toUpperCase(), {
    x:
      842 / 2 -
      fontBold.widthOfTextAtSize(opts.userDisplayName.toUpperCase(), 20) / 2,
    y,
    size: 20,
    font: fontBold,
    color: ROSE,
  });

  y -= 36;
  const courseWrapped = wrap(opts.courseTitle, 842 - margin * 2, 13);
  for (const ln of courseWrapped) {
    page.drawText(ln, {
      x: 842 / 2 - font.widthOfTextAtSize(ln, 13) / 2,
      y,
      size: 13,
      font: fontBold,
      color: TEXT,
    });
    y -= 18;
  }

  y -= 20;
  const dateStr = opts.completedAt.toLocaleDateString("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(`Montevideo, ${dateStr}`, {
    x: 842 / 2 - fontItalic.widthOfTextAtSize(`Montevideo, ${dateStr}`, 11) / 2,
    y,
    size: 11,
    font: fontItalic,
    color: SUB,
  });

  y -= 56;
  page.drawLine({
    start: { x: 842 / 2 - 100, y },
    end: { x: 842 / 2 + 100, y },
    thickness: 0.5,
    color: SUB,
  });
  page.drawText("Equipo Karamba", {
    x: 842 / 2 - font.widthOfTextAtSize("Equipo Karamba", 10) / 2,
    y: y - 14,
    size: 10,
    font,
    color: SUB,
  });

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 842,
    height: 14,
    color: MINT,
  });

  return pdf.save();
}
