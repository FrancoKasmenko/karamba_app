import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import puppeteer from "puppeteer";
import { karambaLogoDataUrl } from "@/lib/brand-logo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
  }).format(price);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { images: true } },
          courseSession: {
            include: { course: { select: { title: true } } },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = Math.max(0, order.total - subtotal);
  const shortId = order.id.slice(-8).toUpperCase();

  const statusMap: Record<string, string> = {
    PENDING: "Pendiente",
    PROCESSING: "Procesando",
    PAID: "Pagado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };

  const statusColorMap: Record<string, string> = {
    PENDING: "#f59e0b",
    PROCESSING: "#3b82f6",
    PAID: "#10b981",
    SHIPPED: "#8b5cf6",
    DELIVERED: "#059669",
    CANCELLED: "#ef4444",
  };

  const logoDataUrl = await karambaLogoDataUrl();

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Poppins', sans-serif;
    color: #4a3f3f;
    font-size: 13px;
    line-height: 1.6;
    padding: 40px;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 30px;
    border-bottom: 2px solid #fdd7de;
    margin-bottom: 30px;
  }
  .brand-logo {
    max-height: 52px;
    max-width: 220px;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: left center;
    display: block;
    margin-bottom: 10px;
  }
  .brand h1 {
    font-size: 28px;
    font-weight: 700;
    color: #e8637a;
    margin-bottom: 4px;
  }
  .brand p {
    font-size: 11px;
    color: #888;
    line-height: 1.5;
  }
  .invoice-meta {
    text-align: right;
  }
  .invoice-meta h2 {
    font-size: 22px;
    font-weight: 700;
    color: #5e4a4e;
    margin-bottom: 8px;
  }
  .invoice-meta .field {
    font-size: 11px;
    color: #888;
    margin-bottom: 2px;
  }
  .invoice-meta .field span {
    color: #5e4a4e;
    font-weight: 500;
  }
  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    color: white;
    margin-top: 6px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 30px;
  }
  .info-box h3 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #e8637a;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .info-box p {
    font-size: 12px;
    color: #666;
    line-height: 1.7;
  }
  .info-box p strong {
    color: #5e4a4e;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }
  thead th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #e8637a;
    font-weight: 600;
    padding: 10px 12px;
    border-bottom: 2px solid #fdd7de;
  }
  thead th:last-child,
  thead th:nth-child(3),
  thead th:nth-child(4) {
    text-align: right;
  }
  tbody td {
    padding: 12px;
    border-bottom: 1px solid #f5f0ed;
    vertical-align: middle;
    font-size: 12px;
  }
  tbody td:last-child,
  tbody td:nth-child(3),
  tbody td:nth-child(4) {
    text-align: right;
  }
  .product-name {
    font-weight: 600;
    color: #5e4a4e;
  }
  .variant {
    font-size: 11px;
    color: #999;
  }
  .totals {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 40px;
  }
  .totals-box {
    width: 280px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 12px;
  }
  .totals-row.total {
    border-top: 2px solid #fdd7de;
    padding-top: 10px;
    margin-top: 6px;
    font-weight: 700;
    font-size: 16px;
    color: #e8637a;
  }
  .footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid #f5f0ed;
  }
  .footer p {
    font-size: 10px;
    color: #bbb;
    line-height: 1.7;
  }
  .footer .thanks {
    font-size: 13px;
    color: #e8637a;
    font-weight: 600;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${
        logoDataUrl
          ? `<img class="brand-logo" src="${logoDataUrl}" alt="Karamba" />`
          : `<h1>Karamba</h1>`
      }
      <p>Tienda Creativa</p>
      <p>Solferino 4041, Montevideo, Uruguay</p>
      <p>Tel: 2509 9128 · WhatsApp: 097 629 629</p>
      <p>karamba@vera.com.uy</p>
    </div>
    <div class="invoice-meta">
      <h2>FACTURA</h2>
      <div class="field">Nº de orden: <span>#${shortId}</span></div>
      <div class="field">Fecha: <span>${formatDate(order.createdAt)}</span></div>
      ${order.paymentId ? `<div class="field">ID de pago: <span>${order.paymentId}</span></div>` : ""}
      <div class="status-badge" style="background: ${statusColorMap[order.status] || "#888"}">
        ${statusMap[order.status] || order.status}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Cliente</h3>
      <p><strong>${order.shippingName || order.user.name || "—"}</strong></p>
      <p>${order.user.email}</p>
      <p>${order.shippingPhone || order.user.phone || ""}</p>
    </div>
    <div class="info-box">
      <h3>Envío</h3>
      <p>${order.shippingAddress || "—"}</p>
      <p>${order.shippingCity || ""}</p>
      ${order.notes ? `<p style="margin-top:6px; font-style:italic; color:#999">Nota: ${order.notes}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Cant.</th>
        <th>Precio unit.</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${order.items
        .map(
          (item) => `
        <tr>
          <td>
            <span class="product-name">${item.productName}</span>
            ${item.variant ? `<br><span class="variant">${item.variant}</span>` : ""}
          </td>
          <td style="text-align:center">${item.quantity}</td>
          <td>${formatPrice(item.price)}</td>
          <td>${formatPrice(item.price * item.quantity)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      ${
        shippingCost > 0
          ? `<div class="totals-row">
        <span>Envío</span>
        <span>${formatPrice(shippingCost)}</span>
      </div>`
          : ""
      }
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatPrice(order.total)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p class="thanks">¡Gracias por tu compra!</p>
    <p>Karamba – Tienda Creativa · Uruguay</p>
    <p>www.karamba.com.uy · Instagram: @karamba</p>
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${shortId}.pdf"`,
      },
    });
  } catch (err) {
    if (browser) await browser.close();
    console.error("[INVOICE] Error generando PDF:", err);
    return NextResponse.json(
      { error: "Error al generar factura" },
      { status: 500 }
    );
  }
}
