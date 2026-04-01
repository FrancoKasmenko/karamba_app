import { load } from "cheerio";

/**
 * Portlet oficial de cotizaciones del BROU (misma fuente que usan scrapers públicos).
 * @see https://www.brou.com.uy/cotizaciones/
 */
const BROU_COTIZACIONES_PORTLET_URL =
  "https://www.brou.com.uy/c/portal/render_portlet?p_l_id=20593&p_p_id=cotizacionfull_WAR_broutmfportlet_INSTANCE_otHfewh1klyS";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { value: number; fetchedAt: number };
let cache: CacheEntry | null = null;

function parseUyNumber(raw: string): number | null {
  let t = raw.replace(/\s/g, "");
  if (t.length === 0) return null;
  if (t.includes(",") && t.includes(".")) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
      t = t.replace(/\./g, "").replace(",", ".");
    } else {
      t = t.replace(/,/g, "");
    }
  } else if (t.includes(",")) {
    t = t.replace(",", ".");
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Filas de «Dólar» del BROU (excluye peso argentino/chileno/mexicano, etc.).
 */
function isUruguayUsdRow(currencyLabel: string): boolean {
  const u = currencyLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!u.includes("dolar")) return false;
  if (u.includes("argentino")) return false;
  if (u.includes("chileno")) return false;
  if (u.includes("mexicano")) return false;
  return true;
}

/**
 * Mayor cotización en $U por 1 USD entre compra y venta de todas las filas de dólar USA del BROU
 * («dólar más caro» = más pesos por dólar).
 */
export async function fetchBrouMaxUyuPerUsd(): Promise<number | null> {
  const res = await fetch(BROU_COTIZACIONES_PORTLET_URL, {
    headers: {
      "User-Agent":
        "KarambaEcommerce/1.0 (checkout PayPal; +https://karamba.com.uy)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[BROU] HTTP", res.status, BROU_COTIZACIONES_PORTLET_URL);
    return null;
  }

  const html = await res.text();
  const $ = load(html);
  const table = $("table").first();
  if (!table.length) {
    console.error("[BROU] tabla de cotizaciones no encontrada");
    return null;
  }

  const candidates: number[] = [];
  const rows = table.find("tr");

  rows.each((i, tr) => {
    if (i === 0) return;
    const cols = $(tr).find("td");
    if (cols.length < 5) return;
    const currency = cols.eq(0).find("p.moneda").text().trim();
    if (!isUruguayUsdRow(currency)) return;
    const compra = parseUyNumber(cols.eq(2).find("p.valor").text());
    const venta = parseUyNumber(cols.eq(4).find("p.valor").text());
    if (compra != null) candidates.push(compra);
    if (venta != null) candidates.push(venta);
  });

  if (candidates.length === 0) {
    console.error("[BROU] sin valores USD parseables");
    return null;
  }

  return Math.max(...candidates);
}

/**
 * Tipo BROU en $U por 1 USD, con cache en memoria (15 min).
 */
export async function getBrouMaxUyuPerUsdCached(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  const fresh = await fetchBrouMaxUyuPerUsd();
  if (fresh != null) {
    cache = { value: fresh, fetchedAt: now };
    return fresh;
  }
  if (cache) return cache.value;
  return null;
}
