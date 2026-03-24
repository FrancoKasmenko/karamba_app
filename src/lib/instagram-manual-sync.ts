import fs from "fs/promises";
import path from "path";
import {
  fetchPostGraphQL,
  getInstagramGraphqlContext,
  shortcodeFromUrl,
  INSTAGRAM_FETCH_UA,
} from "@/lib/instagram-scrape";

const IG_HOST = /instagram\.com/i;

export type ManualFeedRow = {
  url: string;
  image?: string;
  caption?: string;
  is_video?: boolean;
  /** Si true, no descarga; usa image tal cual */
  skipInstagramDownload?: boolean;
};

/**
 * Al guardar en admin: descarga miniaturas de posts de Instagram a public/uploads/instagram/
 * y devuelve el JSON enriquecido con rutas locales.
 */
export async function syncInstagramManualFeedRows(
  rows: unknown[]
): Promise<{ rows: unknown[]; syncErrors: string[] }> {
  const syncErrors: string[] = [];
  const out: unknown[] = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows, syncErrors };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "instagram");
  await fs.mkdir(dir, { recursive: true });

  const instagramRows = rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const o = row as Record<string, unknown>;
    const url = String(o.url || "").trim();
    return IG_HOST.test(url) && Boolean(shortcodeFromUrl(url));
  });

  let ctx: Awaited<ReturnType<typeof getInstagramGraphqlContext>> | null = null;
  if (instagramRows.length > 0) {
    try {
      ctx = await getInstagramGraphqlContext();
    } catch (e) {
      syncErrors.push(
        `Instagram (contexto): ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") {
      out.push(row);
      continue;
    }
    const o = row as Record<string, unknown>;
    const url = String(o.url || "").trim();
    const skipDl = o.skipInstagramDownload === true;

    if (!url) {
      syncErrors.push(`Fila ${i + 1}: falta url`);
      out.push(row);
      continue;
    }

    if (!IG_HOST.test(url)) {
      const img = String(o.image || "").trim();
      if (!img) {
        syncErrors.push(
          `Fila ${i + 1}: para URLs que no son de Instagram hace falta "image"`
        );
      }
      out.push(row);
      continue;
    }

    const sc = shortcodeFromUrl(url);
    if (!sc) {
      syncErrors.push(`Fila ${i + 1}: no se reconoce el post en la URL`);
      out.push(row);
      continue;
    }

    if (skipDl) {
      const saved: ManualFeedRow = {
        url,
        image:
          String(o.image || "").trim() ||
          `/api/uploads/instagram/${sc}.jpg`,
      };
      if (typeof o.caption === "string") saved.caption = o.caption;
      if (o.is_video === true) saved.is_video = true;
      out.push(saved);
      continue;
    }

    if (!ctx) {
      syncErrors.push(`${sc}: sin contexto GraphQL, no se descargó`);
      out.push({
        url,
        image: String(o.image || "").trim() || `/api/uploads/instagram/${sc}.jpg`,
        ...(typeof o.caption === "string" ? { caption: o.caption } : {}),
        ...(o.is_video === true ? { is_video: true } : {}),
      });
      continue;
    }

    let post: Awaited<ReturnType<typeof fetchPostGraphQL>> = null;
    try {
      post = await fetchPostGraphQL(sc, ctx.lsd, ctx.igAppId, ctx.docId);
    } catch (e) {
      syncErrors.push(
        `${sc}: GraphQL ${e instanceof Error ? e.message : String(e)}`
      );
    }
    await new Promise((r) => setTimeout(r, 120));

    if (!post?.image) {
      syncErrors.push(`${sc}: Instagram no devolvió miniatura`);
      out.push({
        url: post?.url || url,
        image: String(o.image || "").trim() || `/api/uploads/instagram/${sc}.jpg`,
        ...(typeof o.caption === "string" ? { caption: o.caption } : {}),
        ...(o.is_video === true ? { is_video: true } : {}),
      });
      continue;
    }

    try {
      const imgRes = await fetch(post.image, {
        headers: {
          "User-Agent": INSTAGRAM_FETCH_UA,
          Referer: "https://www.instagram.com/",
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(25_000),
      });
      if (!imgRes.ok) {
        syncErrors.push(`${sc}: descarga imagen HTTP ${imgRes.status}`);
        out.push({
          url: post.url,
          image: String(o.image || "").trim() || `/api/uploads/instagram/${sc}.jpg`,
          caption:
            typeof o.caption === "string" ? o.caption : post.caption || undefined,
          is_video: Boolean(o.is_video) || post.is_video,
        });
        continue;
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const ct = (imgRes.headers.get("content-type") || "").toLowerCase();
      const ext = ct.includes("png")
        ? "png"
        : ct.includes("webp")
          ? "webp"
          : "jpg";
      const fileName = `${sc}.${ext}`;
      await fs.writeFile(path.join(dir, fileName), buf);
      const publicPath = `/api/uploads/instagram/${fileName}`;
      out.push({
        url: post.url,
        image: publicPath,
        caption:
          typeof o.caption === "string" ? o.caption : post.caption || undefined,
        is_video: Boolean(o.is_video) || post.is_video,
      });
    } catch (e) {
      syncErrors.push(
        `${sc}: ${e instanceof Error ? e.message : String(e)}`
      );
      out.push({
        url: post.url,
        image: String(o.image || "").trim() || `/api/uploads/instagram/${sc}.jpg`,
        caption:
          typeof o.caption === "string" ? o.caption : post.caption || undefined,
        is_video: Boolean(o.is_video) || post.is_video,
      });
    }
  }

  return { rows: out, syncErrors };
}
