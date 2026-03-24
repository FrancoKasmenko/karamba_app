const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const imageCache = new Map();

// ─── Slugify ────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ─── Clean description ──────────────────────────────────────────────────────
function cleanText(text) {
  if (!text) return "";
  let cleaned = text;

  const cutMarkers = [
    "<h3>INFORMACIÓN IMPORTANTE",
    "<h3>✨ INFORMACIÓN IMPORTANTE",
    "<strong>INFORMACIÓN IMPORTANTE",
    "<strong>IMPORTANTE</strong>",
    "<strong>IMPORTANTE",
    "INFORMACIÓN IMPORTANTE SOBRE TU COMPRA",
    "IMPORTANTE\n",
    "IMPORTANTE\\n",
    "LEER!!",
    "Realizamos envíos a todo Uruguay",
    "Trabajamos con envios a todo Uruguay",
    "Trabajamos con envíos a todo Uruguay",
    "¿Tienen local",
  ];

  for (const marker of cutMarkers) {
    const idx = cleaned.indexOf(marker);
    if (idx >= 0) {
      cleaned = cleaned.substring(0, idx);
    }
  }

  cleaned = cleaned
    .replace(/<br\s*\/?[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  cleaned = cleaned.replace(/\n+T$/, "").trim();

  return cleaned;
}

// ─── Download image ─────────────────────────────────────────────────────────
async function downloadImage(url, uploadDir) {
  url = url.trim();
  if (!url || !url.startsWith("http")) return null;
  if (imageCache.has(url)) return imageCache.get(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Karamba Import)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`    ⚠ HTTP ${response.status}: ${url.slice(-50)}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const contentType = response.headers.get("content-type") || "";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    else if (contentType.includes("gif")) ext = ".gif";
    else {
      try {
        const urlPath = new URL(url).pathname.toLowerCase();
        const urlExt = path.extname(urlPath).split("?")[0];
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(urlExt))
          ext = urlExt;
      } catch {}
    }

    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const localPath = `/api/uploads/products/${filename}`;
    imageCache.set(url, localPath);
    return localPath;
  } catch (err) {
    console.log(
      `    ⚠ Descarga fallida: ${url.slice(-50)} → ${err.message}`
    );
    return null;
  }
}

// ─── Categories ─────────────────────────────────────────────────────────────
function parseCategoryField(catField) {
  if (!catField) return [];
  return catField
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

const categoryCache = {};

async function ensureCategory(catString) {
  const parts = catString.split(" > ").map((p) => p.trim());
  let parentId = null;
  let lastCategory = null;

  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    const cacheKey = parts.slice(0, i + 1).join(" > ");

    if (categoryCache[cacheKey]) {
      lastCategory = categoryCache[cacheKey];
      parentId = lastCategory.id;
      continue;
    }

    const baseSlug = slugify(name);

    let category = await prisma.category.findFirst({
      where: { name, parentId: parentId || null },
    });

    if (!category) {
      let finalSlug = baseSlug;
      const existing = await prisma.category.findUnique({
        where: { slug: finalSlug },
      });

      if (existing) {
        const parentPart =
          parentId && lastCategory ? slugify(lastCategory.name) + "-" : "";
        finalSlug = `${parentPart}${baseSlug}`;
        const still = await prisma.category.findUnique({
          where: { slug: finalSlug },
        });
        if (still) {
          finalSlug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
        }
      }

      category = await prisma.category.create({
        data: { name, slug: finalSlug, parentId: parentId || null },
      });
      console.log(`  📂 Categoría: ${cacheKey} → /${finalSlug}`);
    }

    categoryCache[cacheKey] = category;
    parentId = category.id;
    lastCategory = category;
  }

  return lastCategory;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Importación de productos WooCommerce → Karamba\n");
  console.log("=".repeat(55));

  const csvPath = path.join(
    process.cwd(),
    "public",
    "scripts",
    "woo-products.csv"
  );

  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV no encontrado:", csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
    bom: true,
  });

  console.log(`📄 ${records.length} filas leídas del CSV`);

  const productRows = records.filter(
    (r) => r.Tipo === "simple" || r.Tipo === "variable"
  );
  const variationRows = records.filter((r) => r.Tipo === "variation");

  console.log(`📦 ${productRows.length} productos (simple + variable)`);
  console.log(`🔀 ${variationRows.length} variaciones`);
  console.log("=".repeat(55) + "\n");

  const variationsByParent = {};
  for (const v of variationRows) {
    const pid = (v.Superior || "").replace("id:", "").trim();
    if (!pid) continue;
    if (!variationsByParent[pid]) variationsByParent[pid] = [];
    variationsByParent[pid].push(v);
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "products"
  );
  fs.mkdirSync(uploadDir, { recursive: true });

  const usedSlugs = new Set();
  const existingProducts = await prisma.product.findMany({
    select: { slug: true },
  });
  for (const p of existingProducts) usedSlugs.add(p.slug);

  const existingCategories = await prisma.category.findMany();
  for (const c of existingCategories) {
    const key = c.parentId
      ? existingCategories.find((p) => p.id === c.parentId)?.name +
        " > " +
        c.name
      : c.name;
    categoryCache[key] = c;
  }

  let stats = { created: 0, skipped: 0, errors: 0, variants: 0, images: 0 };

  for (let i = 0; i < productRows.length; i++) {
    const row = productRows[i];
    const wooId = row.ID;
    const name = (row.Nombre || "").trim();

    if (!name) {
      console.log(`⏭ #${wooId}: sin nombre`);
      stats.skipped++;
      continue;
    }

    console.log(
      `[${i + 1}/${productRows.length}] 📦 ${name} (${row.Tipo}, woo:${wooId})`
    );

    try {
      let slug = slugify(name);
      if (usedSlugs.has(slug)) slug = `${slug}-${wooId}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${randomUUID().slice(0, 5)}`;
      usedSlugs.add(slug);

      const shortDesc = cleanText(row["Descripción corta"] || "");
      const longDesc = cleanText(row["Descripción"] || "");
      const description = shortDesc || longDesc || "";

      const salePrice = parseFloat(row["Precio rebajado"]) || 0;
      const regularPrice = parseFloat(row["Precio normal"]) || 0;
      let price = salePrice || regularPrice;
      let comparePrice = salePrice && regularPrice > salePrice ? regularPrice : null;

      if (row.Tipo === "variable" && !price) {
        const children = variationsByParent[wooId] || [];
        const childPrices = children
          .map(
            (v) =>
              parseFloat(v["Precio rebajado"]) ||
              parseFloat(v["Precio normal"]) ||
              0
          )
          .filter((p) => p > 0);
        price = childPrices.length > 0 ? Math.min(...childPrices) : 0;
      }

      if (!price) {
        console.log(`  ⏭ Sin precio, saltando`);
        stats.skipped++;
        continue;
      }

      const featured = row["¿Está destacado?"] === "1";
      const active = row.Publicado === "1";

      // ── Images ──
      const rawImages = (row["Imágenes"] || "")
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http"));
      const uniqueUrls = [...new Set(rawImages)];

      const localImages = [];
      for (const url of uniqueUrls) {
        const local = await downloadImage(url, uploadDir);
        if (local) {
          localImages.push(local);
          stats.images++;
        }
      }
      console.log(
        `  🖼 ${localImages.length}/${uniqueUrls.length} imágenes`
      );

      // ── Categories ──
      const catStrings = parseCategoryField(row["Categorías"]);
      let categoryId = null;
      let maxDepth = 0;

      for (const catStr of catStrings) {
        const cat = await ensureCategory(catStr);
        if (cat) {
          const depth = catStr.split(" > ").length;
          if (depth >= maxDepth) {
            maxDepth = depth;
            categoryId = cat.id;
          }
        }
      }

      // ── Create product ──
      const product = await prisma.product.create({
        data: {
          name,
          slug,
          description,
          price,
          comparePrice,
          images: localImages,
          featured,
          active,
          categoryId,
        },
      });

      console.log(`  ✅ Creado → /${slug} ($${price})`);

      // ── Variants ──
      if (row.Tipo === "variable") {
        const children = variationsByParent[wooId] || [];

        if (children.length > 0) {
          let count = 0;
          for (const v of children) {
            const attrName = (
              v["Nombre del atributo 1"] || "Opción"
            ).trim();
            const attrValue = (
              v["Valor(es) del atributo 1"] || ""
            ).trim();
            if (!attrValue) continue;

            const vPrice =
              parseFloat(v["Precio rebajado"]) ||
              parseFloat(v["Precio normal"]) ||
              price;

            await prisma.variant.create({
              data: {
                name: attrName,
                value: attrValue,
                price: vPrice,
                stock: 0,
                productId: product.id,
              },
            });
            count++;
          }
          if (count > 0) {
            console.log(`  🔀 ${count} variantes (variaciones)`);
            stats.variants += count;
          }
        } else {
          const count = await createVariantsFromAttributes(
            row,
            product.id,
            price
          );
          stats.variants += count;
        }
      } else {
        const count = await createVariantsFromAttributes(
          row,
          product.id,
          price
        );
        stats.variants += count;
      }

      stats.created++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      stats.errors++;
    }
  }

  console.log("\n" + "=".repeat(55));
  console.log("📊 RESULTADO DE IMPORTACIÓN");
  console.log("=".repeat(55));
  console.log(`  📦 Productos creados:     ${stats.created}`);
  console.log(`  🔀 Variantes creadas:     ${stats.variants}`);
  console.log(`  🖼 Imágenes descargadas:  ${stats.images}`);
  console.log(
    `  📂 Categorías:            ${Object.keys(categoryCache).length}`
  );
  console.log(`  ⏭ Saltados:               ${stats.skipped}`);
  console.log(`  ❌ Errores:                ${stats.errors}`);
  console.log("=".repeat(55));
}

async function createVariantsFromAttributes(row, productId, fallbackPrice) {
  let totalCreated = 0;

  for (let n = 1; n <= 2; n++) {
    const attrName = (row[`Nombre del atributo ${n}`] || "").trim();
    const attrValuesRaw = (row[`Valor(es) del atributo ${n}`] || "").trim();

    if (!attrName || !attrValuesRaw) continue;

    const values = attrValuesRaw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    for (const val of values) {
      await prisma.variant.create({
        data: {
          name: attrName,
          value: val,
          price: fallbackPrice,
          stock: 0,
          productId,
        },
      });
      totalCreated++;
    }
  }

  if (totalCreated > 0) {
    console.log(`  🔀 ${totalCreated} variantes (atributos)`);
  }

  return totalCreated;
}

main()
  .catch((err) => {
    console.error("\n💥 Error fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
