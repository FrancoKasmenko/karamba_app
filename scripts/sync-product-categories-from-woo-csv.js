/**
 * Sincroniza categoryId de productos existentes según el CSV de WooCommerce.
 * No crea productos ni borra datos; puede crear categorías faltantes en la jerarquía.
 *
 * CSV: public/scripts/woo-products.csv
 *
 * Uso:
 *   node scripts/sync-product-categories-from-woo-csv.js
 */

const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

const CSV_PATH = path.join(
  process.cwd(),
  "public",
  "scripts",
  "woo-products.csv"
);

const categoryCache = {};

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseCategoryField(catField) {
  if (!catField) return [];
  return catField
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function depthOf(catString) {
  return catString.split(" > ").filter((p) => p.trim()).length;
}

/** Precarga categoryCache[path] para toda la jerarquía existente en DB. */
async function seedCategoryCacheFromDb() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true, slug: true },
  });
  const byParent = new Map();
  for (const c of categories) {
    const pid = c.parentId ?? "__root__";
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(c);
  }

  function walk(cat, pathParts) {
    const key = pathParts.join(" > ");
    categoryCache[key] = cat;
    const children = byParent.get(cat.id) || [];
    for (const ch of children) {
      walk(ch, [...pathParts, ch.name]);
    }
  }

  const roots = byParent.get("__root__") || [];
  for (const r of roots) {
    walk(r, [r.name]);
  }
}

async function ensureCategory(catString) {
  const parts = catString.split(" > ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

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
      console.log(`  📂 Nueva categoría: ${cacheKey} → slug ${finalSlug}`);
    }

    categoryCache[cacheKey] = category;
    parentId = category.id;
    lastCategory = category;
  }

  return lastCategory;
}

async function findExistingProduct(nombre, wooId) {
  const name = (nombre || "").trim();
  if (!name) return null;

  const byName = await prisma.product.findFirst({
    where: { name },
    select: { id: true, name: true, slug: true, categoryId: true },
  });
  if (byName) return { product: byName, how: "name" };

  const base = slugify(name);
  if (base) {
    const bySlug = await prisma.product.findFirst({
      where: { slug: base },
      select: { id: true, name: true, slug: true, categoryId: true },
    });
    if (bySlug) return { product: bySlug, how: "slug" };

    const wid = (wooId || "").toString().trim();
    if (wid) {
      const byWooSlug = await prisma.product.findFirst({
        where: { slug: `${base}-${wid}` },
        select: { id: true, name: true, slug: true, categoryId: true },
      });
      if (byWooSlug) return { product: byWooSlug, how: "slug+wooId" };
    }

    const bySlugSuffix = await prisma.product.findFirst({
      where: { slug: { startsWith: `${base}-` } },
      select: { id: true, name: true, slug: true, categoryId: true },
    });
    if (bySlugSuffix) return { product: bySlugSuffix, how: "slug-suffix" };
  }

  return null;
}

/**
 * Entre varias rutas CSV (separadas por coma), elige la hoja de mayor profundidad.
 */
async function resolveDeepestCategory(catStrings) {
  let best = null;
  let bestDepth = -1;
  let bestPath = "";

  for (const raw of catStrings) {
    const d = depthOf(raw);
    const leaf = await ensureCategory(raw);
    if (!leaf) continue;
    if (d > bestDepth || (d === bestDepth && raw.length > bestPath.length)) {
      bestDepth = d;
      best = leaf;
      bestPath = raw;
    }
  }

  return best;
}

async function main() {
  console.log(
    "📁 Sincronizar categorías (WooCommerce CSV → productos existentes)\n"
  );
  console.log("=".repeat(60));

  if (!fs.existsSync(CSV_PATH)) {
    console.error("❌ CSV no encontrado:", CSV_PATH);
    process.exit(1);
  }

  await seedCategoryCacheFromDb();
  console.log(
    `📚 Caché inicial: ${Object.keys(categoryCache).length} rutas de categoría en DB\n`
  );

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

  console.log(`📄 ${records.length} filas → ${rows.length} productos CSV\n`);

  const stats = {
    updated: 0,
    unchanged: 0,
    skippedNoProduct: 0,
    skippedNoCategories: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = (row.Nombre || "").trim();
    const wooId = row.ID || "?";

    if (!nombre) continue;

    const found = await findExistingProduct(nombre, row.ID);
    if (!found) {
      stats.skippedNoProduct++;
      console.log(
        `[${i + 1}/${rows.length}] ⏭ "${nombre}" (woo #${wooId}) → no en DB`
      );
      continue;
    }

    const catStrings = parseCategoryField(row["Categorías"] || "");
    if (catStrings.length === 0) {
      stats.skippedNoCategories++;
      console.log(
        `[${i + 1}/${rows.length}] ⏭ "${nombre}" [${found.how}] → CSV sin categorías`
      );
      continue;
    }

    const leaf = await resolveDeepestCategory(catStrings);
    if (!leaf) {
      stats.skippedNoCategories++;
      console.log(
        `[${i + 1}/${rows.length}] ⚠ "${nombre}" → no se pudo resolver categoría`
      );
      continue;
    }

    if (found.product.categoryId === leaf.id) {
      stats.unchanged++;
      console.log(
        `[${i + 1}/${rows.length}] ✓ "${nombre}" ya en "${leaf.name}" (${leaf.id})`
      );
      continue;
    }

    await prisma.product.update({
      where: { id: found.product.id },
      data: { categoryId: leaf.id },
    });

    stats.updated++;
    console.log(
      `[${i + 1}/${rows.length}] ✅ "${nombre}" [${found.how}] → categoryId ${leaf.id} (${leaf.name})`
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Actualizados:              ${stats.updated}`);
  console.log(`Sin cambios (ya correcto): ${stats.unchanged}`);
  console.log(`Sin producto en DB:        ${stats.skippedNoProduct}`);
  console.log(`Sin categorías en CSV:     ${stats.skippedNoCategories}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
