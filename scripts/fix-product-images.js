/**
 * Descarga imágenes externas de productos existentes y las guarda en /public/uploads/products/.
 * No crea ni borra productos; solo actualiza rutas http(s) → locales.
 *
 * Uso:
 *   node scripts/fix-product-images.js
 *   docker exec -it karamba_app node scripts/fix-product-images.js
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

const prisma = new PrismaClient();

const DOWNLOAD_TIMEOUT_MS = 15_000;
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "products");

/** URL remota → ruta local ya descargada en esta ejecución (evita duplicados en red y en disco). */
const urlToLocalPath = new Map();

function isBlockedUrl(s) {
  return /placehold\.co/i.test(s);
}

function isAlreadyLocal(u) {
  const t = (u || "").trim();
  if (!t) return true;
  if (t.startsWith("/uploads")) return true;
  return false;
}

function isExternalUrl(u) {
  const t = (u || "").trim();
  if (!t || isBlockedUrl(t)) return false;
  if (isAlreadyLocal(t)) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith("//")) return true;
  return false;
}

function toAbsoluteUrl(u) {
  const t = u.trim();
  if (t.startsWith("//")) return `https:${t}`;
  return t;
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

function uniqueName(productId, ext) {
  const rand = randomBytes(8).toString("hex");
  return `product-${productId}-${rand}${ext}`;
}

async function downloadToLocal(absoluteUrl, productId) {
  const normalized = absoluteUrl.trim();
  if (urlToLocalPath.has(normalized)) {
    return urlToLocalPath.get(normalized);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const response = await fetch(normalized, {
      headers: { "User-Agent": "Mozilla/5.0 (Karamba fix-product-images)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`    ⚠ HTTP ${response.status}: ${normalized.slice(0, 80)}…`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      console.warn(`    ⚠ Respuesta vacía: ${normalized.slice(0, 80)}…`);
      return null;
    }

    const ext = pickExtension(response.headers.get("content-type"), normalized);
    const filename = uniqueName(productId, ext);
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const localPath = `/uploads/products/${filename}`;
    urlToLocalPath.set(normalized, localPath);
    return localPath;
  } catch (err) {
    const msg = err.name === "AbortError" ? "timeout" : err.message;
    console.warn(`    ⚠ Descarga fallida (${msg}): ${normalized.slice(0, 80)}…`);
    return null;
  }
}

async function resolveOneUrl(raw, productId) {
  const u = (raw || "").trim();
  if (!u) return u;
  if (isBlockedUrl(u)) return u;
  if (!isExternalUrl(u)) return u;

  const absolute = toAbsoluteUrl(u);
  return (await downloadToLocal(absolute, productId)) ?? u;
}

async function main() {
  console.log("🖼️  Fix product images (externas → /public/uploads/products/)\n");

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      imageUrl: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  let failedSlots = 0;

  for (const p of products) {
    const hasExternalInImages = (p.images || []).some(isExternalUrl);
    const hasExternalImageUrl = p.imageUrl && isExternalUrl(p.imageUrl);

    if (!hasExternalInImages && !hasExternalImageUrl) {
      skipped++;
      continue;
    }

    const label = p.slug || p.name || p.id;
    console.log(`→ ${label} (${p.id})`);

    let newImages = p.images;
    if (hasExternalInImages) {
      newImages = [];
      for (let i = 0; i < p.images.length; i++) {
        const before = p.images[i];
        const after = await resolveOneUrl(before, p.id);
        if (isExternalUrl(before) && after === before) failedSlots++;
        newImages.push(after);
      }
    }

    let newImageUrl = p.imageUrl;
    if (hasExternalImageUrl) {
      newImageUrl = await resolveOneUrl(p.imageUrl, p.id);
      if (isExternalUrl(p.imageUrl) && newImageUrl === p.imageUrl) failedSlots++;
    }

    const sameImages =
      JSON.stringify(newImages) === JSON.stringify(p.images);
    const sameCover = newImageUrl === p.imageUrl;

    if (sameImages && sameCover) {
      console.log("   (sin cambios tras errores o ya local)\n");
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        images: newImages,
        imageUrl: newImageUrl,
      },
    });
    updated++;
    console.log("   ✓ Guardado\n");
  }

  console.log("───");
  console.log(`Productos actualizados: ${updated}`);
  console.log(`Sin URLs externas (omitidos): ${skipped}`);
  console.log(`Slots externos sin poder migrar: ${failedSlots}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
