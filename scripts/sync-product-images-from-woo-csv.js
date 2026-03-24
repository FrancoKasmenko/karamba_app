/**
 * Lee el CSV de WooCommerce y asigna imágenes solo a productos que ya existen
 * y tienen el array `images` vacío. No crea productos.
 *
 * CSV: public/scripts/woo-products.csv
 *
 * Uso:
 *   node scripts/sync-product-images-from-woo-csv.js
 */

const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

const prisma = new PrismaClient();

const DOWNLOAD_TIMEOUT_MS = 15_000;

const CSV_PATH = path.join(
  process.cwd(),
  "public",
  "scripts",
  "woo-products.csv"
);
const UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "products"
);

/** URL absoluta → ruta /uploads/products/... (una descarga por URL por ejecución). */
const urlToLocalPath = new Map();

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function isValidImageUrl(u) {
  const t = (u || "").trim();
  if (!t) return false;
  if (!/^https?:\/\//i.test(t) && !t.startsWith("//")) return false;
  try {
    const abs = t.startsWith("//") ? `https:${t}` : t;
    new URL(abs);
    return true;
  } catch {
    return false;
  }
}

function toAbsoluteUrl(u) {
  const t = u.trim();
  return t.startsWith("//") ? `https:${t}` : t;
}

function parseImageUrls(raw) {
  const parts = (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = parts.filter(isValidImageUrl);
  return [...new Set(valid.map(toAbsoluteUrl))];
}

function pickExtension(contentType, url) {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  try {
    const p = new URL(url).pathname.toLowerCase();
    const ext = path.extname(p.split("?")[0]);
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    /* ignore */
  }
  return ".jpg";
}

function uniqueFilename(productId, ext) {
  const rand = randomBytes(8).toString("hex");
  return `woo-sync-${productId}-${rand}${ext}`;
}

async function downloadImage(url, productId) {
  if (urlToLocalPath.has(url)) {
    return urlToLocalPath.get(url);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Karamba woo-csv-sync)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`      ⚠ HTTP ${response.status}: ${url.slice(0, 72)}…`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      console.warn(`      ⚠ Vacío: ${url.slice(0, 72)}…`);
      return null;
    }

    const ext = pickExtension(response.headers.get("content-type"), url);
    const filename = uniqueFilename(productId, ext);
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const localPath = `/uploads/products/${filename}`;
    urlToLocalPath.set(url, localPath);
    return localPath;
  } catch (err) {
    const msg = err.name === "AbortError" ? "timeout" : err.message;
    console.warn(`      ⚠ Fallo (${msg}): ${url.slice(0, 72)}…`);
    return null;
  }
}

async function findExistingProduct(nombre, wooId) {
  const name = (nombre || "").trim();
  if (!name) return null;

  const byName = await prisma.product.findFirst({
    where: { name },
    select: { id: true, name: true, slug: true, images: true },
  });
  if (byName) return { product: byName, how: "name" };

  const base = slugify(name);
  if (base) {
    const bySlug = await prisma.product.findFirst({
      where: { slug: base },
      select: { id: true, name: true, slug: true, images: true },
    });
    if (bySlug) return { product: bySlug, how: "slug" };

    const wid = (wooId || "").toString().trim();
    if (wid) {
      const byWooSlug = await prisma.product.findFirst({
        where: { slug: `${base}-${wid}` },
        select: { id: true, name: true, slug: true, images: true },
      });
      if (byWooSlug) return { product: byWooSlug, how: "slug+wooId" };
    }

    const bySlugSuffix = await prisma.product.findFirst({
      where: { slug: { startsWith: `${base}-` } },
      select: { id: true, name: true, slug: true, images: true },
    });
    if (bySlugSuffix) return { product: bySlugSuffix, how: "slug-suffix" };
  }

  return null;
}

async function main() {
  console.log("🖼️  Sincronizar imágenes desde WooCommerce CSV → productos existentes\n");
  console.log("=".repeat(60));

  if (!fs.existsSync(CSV_PATH)) {
    console.error("❌ CSV no encontrado:", CSV_PATH);
    process.exit(1);
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
    bom: true,
  });

  const rows = records.filter(
    (r) => r.Tipo === "simple" || r.Tipo === "variable"
  );

  console.log(`📄 ${records.length} filas CSV → ${rows.length} productos (simple/variable)\n`);

  const stats = {
    updated: 0,
    skippedHasImages: 0,
    skippedNoProduct: 0,
    skippedNoUrls: 0,
    skippedEmptyName: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = (row.Nombre || "").trim();
    const wooId = row.ID || "?";

    if (!nombre) {
      stats.skippedEmptyName++;
      console.log(`[${i + 1}/${rows.length}] ⏭ Woo #${wooId}: sin nombre`);
      continue;
    }

    const found = await findExistingProduct(nombre, row.ID);
    if (!found) {
      stats.skippedNoProduct++;
      console.log(
        `[${i + 1}/${rows.length}] ⏭ "${nombre}" (woo #${wooId}) → no existe en DB`
      );
      continue;
    }

    const { product, how } = found;
    const currentImages = product.images || [];
    if (currentImages.length > 0) {
      stats.skippedHasImages++;
      console.log(
        `[${i + 1}/${rows.length}] ⏭ "${nombre}" → ya tiene ${currentImages.length} imagen(es) [match: ${how}]`
      );
      continue;
    }

    const urls = parseImageUrls(row["Imágenes"] || "");
    if (urls.length === 0) {
      stats.skippedNoUrls++;
      console.log(
        `[${i + 1}/${rows.length}] ⏭ "${nombre}" [match: ${how}] → CSV sin URLs válidas`
      );
      continue;
    }

    console.log(
      `[${i + 1}/${rows.length}] ⬇ "${nombre}" (${product.slug}) [match: ${how}] — ${urls.length} URL(s)`
    );

    const localPaths = [];
    for (const url of urls) {
      const local = await downloadImage(url, product.id);
      if (local) localPaths.push(local);
    }

    if (localPaths.length === 0) {
      console.log(`   ❌ Ninguna imagen descargada; DB sin cambios\n`);
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { images: localPaths },
    });

    stats.updated++;
    console.log(`   ✅ Guardadas ${localPaths.length} → DB\n`);
  }

  console.log("=".repeat(60));
  console.log(`Actualizados:              ${stats.updated}`);
  console.log(`Omitidos (ya con imágenes): ${stats.skippedHasImages}`);
  console.log(`Omitidos (no en DB):        ${stats.skippedNoProduct}`);
  console.log(`Omitidos (CSV sin URLs):    ${stats.skippedNoUrls}`);
  console.log(`Omitidos (sin nombre):      ${stats.skippedEmptyName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
