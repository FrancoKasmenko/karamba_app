/**
 * Feed público: web_profile_info + parseo HTML + GraphQL por shortcode
 * (GraphQL sin cookie: ahmedrangel/instagram-media-scraper).
 */
export type InstagramFeedPost = {
  id: string;
  image: string;
  url: string;
  caption: string;
  is_video: boolean;
};

export type InstagramFeedPayload = {
  success: boolean;
  posts: InstagramFeedPost[];
  source: "manual" | "scrape" | "none";
  error?: string;
};

export const INSTAGRAM_FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const UA = INSTAGRAM_FETCH_UA;

/** @see https://github.com/ahmedrangel/instagram-media-scraper */
const DEFAULT_GQL_DOC_ID = "10015901848480474";
const DEFAULT_GQL_LSD = "AVqbxe3J_YA";
const DEFAULT_IG_APP_ID = "936619743392459";

function instagramUsername(): string {
  return (
    process.env.INSTAGRAM_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME?.trim() ||
    "karamba.uy"
  ).replace(/^@/, "");
}

function profileUrl(): string {
  return `https://www.instagram.com/${instagramUsername()}/`;
}

export function shortcodeFromUrl(url: string): string | null {
  return url.match(/\/(?:p|reel|reels)\/([^/?#]+)/)?.[1] ?? null;
}

function nodeImageUrl(n: {
  display_url?: string;
  thumbnail_src?: string;
  image_versions2?: { candidates?: Array<{ url?: string }> };
}): string {
  return (
    n.display_url ||
    n.thumbnail_src ||
    n.image_versions2?.candidates?.[0]?.url ||
    ""
  );
}

export function extractInstagramTokens(html: string): {
  lsd: string | null;
  igAppId: string | null;
} {
  const lsd =
    html.match(/"LSD",\[\],\{"token":"([^"]+)"/)?.[1] ||
    html.match(/"LSD",null,\{"token":"([^"]+)"/)?.[1] ||
    html.match(/"lsd":"([^"]+)"/)?.[1] ||
    null;
  const igAppId =
    html.match(/"APP_ID":"(\d{10,})"/)?.[1] ||
    html.match(/instagramWebDesktopFBAppId["']?\s*:\s*["']?(\d{10,})/)?.[1] ||
    html.match(/"appId":"(\d{10,})"/)?.[1] ||
    null;
  return { lsd, igAppId };
}

function postPermalink(shortcode: string, isVideo: boolean): string {
  if (isVideo) return `https://www.instagram.com/reel/${shortcode}/`;
  return `https://www.instagram.com/p/${shortcode}/`;
}

function shortcodesFromHtmlLinks(html: string, limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]{5,})\/?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const c = m[1];
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function parseTimelineFromHtml(html: string, limit: number): InstagramFeedPost[] {
  const posts: InstagramFeedPost[] = [];
  const seen = new Set<string>();

  const key = '"edge_owner_to_timeline_media"';
  const pos = html.indexOf(key);
  if (pos !== -1) {
    const edgesNeedle = '"edges":';
    const epos = html.indexOf(edgesNeedle, pos);
    if (epos !== -1) {
      const bracketStart = html.indexOf("[", epos + edgesNeedle.length);
      if (bracketStart !== -1) {
        let depth = 0;
        let inStr = false;
        let esc = false;
        let q = "";
        for (let i = bracketStart; i < html.length; i++) {
          const c = html[i];
          if (esc) {
            esc = false;
            continue;
          }
          if (inStr) {
            if (c === "\\") esc = true;
            else if (c === q) inStr = false;
            continue;
          }
          if (c === '"' || c === "'") {
            inStr = true;
            q = c;
            continue;
          }
          if (c === "[") depth++;
          else if (c === "]") {
            depth--;
            if (depth === 0) {
              const slice = html.slice(bracketStart, i + 1);
              try {
                const edges = JSON.parse(slice) as Array<{
                  node?: {
                    id?: string;
                    shortcode?: string;
                    is_video?: boolean;
                    display_url?: string;
                    thumbnail_src?: string;
                    image_versions2?: { candidates?: Array<{ url?: string }> };
                    edge_media_to_caption?: {
                      edges?: Array<{ node?: { text?: string } }>;
                    };
                  };
                }>;
                for (const edge of edges) {
                  const n = edge?.node;
                  if (!n?.shortcode) continue;
                  const image = nodeImageUrl(n);
                  if (!image) continue;
                  if (seen.has(n.shortcode)) continue;
                  seen.add(n.shortcode);
                  posts.push({
                    id: n.id || n.shortcode,
                    image,
                    url: postPermalink(n.shortcode, Boolean(n.is_video)),
                    caption: n.edge_media_to_caption?.edges?.[0]?.node?.text || "",
                    is_video: Boolean(n.is_video),
                  });
                  if (posts.length >= limit) break;
                }
              } catch {
                /* regex */
              }
              break;
            }
          }
        }
      }
    }
  }

  if (posts.length >= limit) return posts;

  const unescape = (s: string) => s.replace(/\\u0026/g, "&").replace(/\\\//g, "/");

  const push = (short: string, img: string, isVideo: boolean) => {
    if (!short || !img.startsWith("http")) return;
    if (seen.has(short)) return;
    seen.add(short);
    posts.push({
      id: short,
      image: unescape(img),
      url: postPermalink(short, isVideo),
      caption: "",
      is_video: isVideo,
    });
  };

  const reSd = new RegExp(
    String.raw`"shortcode":"([A-Za-z0-9_-]{5,})"[\s\S]{0,4000}?"display_url":"(https:\\/\\/[^"]+)"`,
    "g"
  );
  let m: RegExpExecArray | null;
  while ((m = reSd.exec(html)) !== null && posts.length < limit) {
    push(m[1], m[2], false);
  }
  const reDs = new RegExp(
    String.raw`"display_url":"(https:\\/\\/[^"]+)"[\s\S]{0,4000}?"shortcode":"([A-Za-z0-9_-]{5,})"`,
    "g"
  );
  while ((m = reDs.exec(html)) !== null && posts.length < limit) {
    push(m[2], m[1], false);
  }
  const reSt = new RegExp(
    String.raw`"shortcode":"([A-Za-z0-9_-]{5,})"[\s\S]{0,4000}?"thumbnail_src":"(https:\\/\\/[^"]+)"`,
    "g"
  );
  while ((m = reSt.exec(html)) !== null && posts.length < limit) {
    push(m[1], m[2], false);
  }
  const reTs = new RegExp(
    String.raw`"thumbnail_src":"(https:\\/\\/[^"]+)"[\s\S]{0,4000}?"shortcode":"([A-Za-z0-9_-]{5,})"`,
    "g"
  );
  while ((m = reTs.exec(html)) !== null && posts.length < limit) {
    push(m[2], m[1], false);
  }

  return posts.filter((p) => Boolean(p.image));
}

async function fetchProfileHtml(): Promise<string> {
  const res = await fetch(profileUrl(), {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(22_000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Perfil Instagram HTTP ${res.status}`);
  return res.text();
}

async function fetchWebProfilePosts(
  igAppId: string,
  host: "i.instagram.com" | "www.instagram.com"
): Promise<InstagramFeedPost[]> {
  const user = instagramUsername();
  const res = await fetch(
    `https://${host}/api/v1/users/web_profile_info/?username=${encodeURIComponent(user)}`,
    {
      headers: {
        "User-Agent": UA,
        "X-IG-App-ID": igAppId,
        "X-ASBD-ID": "129477",
        "X-IG-WWW-Claim": "0",
        Accept: "*/*",
        "Accept-Language": "es-ES,es;q=0.9",
        Referer: profileUrl(),
        Origin: "https://www.instagram.com",
      },
      signal: AbortSignal.timeout(18_000),
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: {
          edges?: Array<{
            node: {
              id: string;
              shortcode: string;
              is_video?: boolean;
              display_url?: string;
              thumbnail_src?: string;
              image_versions2?: { candidates?: Array<{ url?: string }> };
              edge_media_to_caption?: {
                edges: Array<{ node: { text: string } }>;
              };
            };
          }>;
        };
      };
    };
  };
  const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges || [];
  return edges.map((edge) => {
    const n = edge.node;
    return {
      id: n.id,
      image: nodeImageUrl(n),
      url: postPermalink(n.shortcode, Boolean(n.is_video)),
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      is_video: Boolean(n.is_video),
    };
  });
}

type GqlMedia = {
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  is_video?: boolean;
  display_resources?: Array<{ src?: string }>;
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
};

export async function fetchPostGraphQL(
  shortcode: string,
  lsd: string,
  igAppId: string,
  docId: string
): Promise<InstagramFeedPost | null> {
  const url = new URL("https://www.instagram.com/api/graphql");
  url.searchParams.set("variables", JSON.stringify({ shortcode }));
  url.searchParams.set("doc_id", docId);
  url.searchParams.set("lsd", lsd);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-IG-App-ID": igAppId,
      "X-FB-LSD": lsd,
      "X-ASBD-ID": "129477",
      "Sec-Fetch-Site": "same-origin",
      Origin: "https://www.instagram.com",
      Referer: `https://www.instagram.com/p/${shortcode}/`,
    },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    errors?: unknown[];
    data?: { xdt_shortcode_media?: GqlMedia | null };
  };
  if (json.errors?.length) return null;
  const items = json?.data?.xdt_shortcode_media;
  if (!items?.shortcode) return null;

  const image =
    items.display_url ||
    items.thumbnail_src ||
    items.display_resources?.[0]?.src ||
    "";
  if (!image) return null;

  return {
    id: items.shortcode,
    image,
    url: postPermalink(items.shortcode, Boolean(items.is_video)),
    caption: items.edge_media_to_caption?.edges?.[0]?.node?.text || "",
    is_video: Boolean(items.is_video),
  };
}

function mergeUniquePosts(posts: InstagramFeedPost[]): InstagramFeedPost[] {
  const seen = new Set<string>();
  const out: InstagramFeedPost[] = [];
  for (const p of posts) {
    const sc = shortcodeFromUrl(p.url) || p.id;
    if (!sc || seen.has(sc)) continue;
    if (!p.image) continue;
    seen.add(sc);
    out.push(p);
  }
  return out;
}

export async function scrapePublicInstagramProfile(
  maxPosts: number
): Promise<InstagramFeedPost[]> {
  const html = await fetchProfileHtml();
  if (/login_required|Log in to Instagram/i.test(html)) {
    throw new Error("Instagram exige inicio de sesión en el HTML del perfil");
  }

  const extracted = extractInstagramTokens(html);
  const igAppId =
    process.env.INSTAGRAM_IG_APP_ID?.trim() ||
    extracted.igAppId ||
    DEFAULT_IG_APP_ID;
  const lsd =
    process.env.INSTAGRAM_GQL_LSD?.trim() ||
    extracted.lsd ||
    DEFAULT_GQL_LSD;
  const docId =
    process.env.INSTAGRAM_GQL_DOC_ID?.trim() || DEFAULT_GQL_DOC_ID;

  const bucket: InstagramFeedPost[] = [];

  for (const host of ["i.instagram.com", "www.instagram.com"] as const) {
    try {
      const fromApi = await fetchWebProfilePosts(igAppId, host);
      if (fromApi.length === 0) continue;
      bucket.push(...fromApi);
      if (fromApi.some((p) => p.image)) break;
    } catch {
      /* siguiente host */
    }
  }

  bucket.push(...parseTimelineFromHtml(html, maxPosts * 3));

  let merged = mergeUniquePosts(bucket);

  if (merged.length < maxPosts) {
    const have = new Set(
      merged.map((p) => shortcodeFromUrl(p.url)).filter(Boolean) as string[]
    );
    const fromBucket = bucket
      .map((p) => shortcodeFromUrl(p.url))
      .filter(Boolean) as string[];
    const candidates = [
      ...new Set([...fromBucket, ...shortcodesFromHtmlLinks(html, 24)]),
    ];
    for (const sc of candidates) {
      if (merged.length >= maxPosts) break;
      if (!sc || have.has(sc)) continue;
      const gql = await fetchPostGraphQL(sc, lsd, igAppId, docId);
      if (gql?.image) {
        have.add(sc);
        merged.push(gql);
        merged = mergeUniquePosts(merged);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  merged = mergeUniquePosts(merged);
  if (merged.length === 0) {
    throw new Error("No se obtuvieron publicaciones (API/HTML/GraphQL)");
  }

  return merged.slice(0, maxPosts);
}

/** Tokens para GraphQL (una sola vez por lote de descargas). */
export async function getInstagramGraphqlContext(): Promise<{
  lsd: string;
  igAppId: string;
  docId: string;
}> {
  const html = await fetchProfileHtml();
  const extracted = extractInstagramTokens(html);
  return {
    lsd:
      process.env.INSTAGRAM_GQL_LSD?.trim() ||
      extracted.lsd ||
      DEFAULT_GQL_LSD,
    igAppId:
      process.env.INSTAGRAM_IG_APP_ID?.trim() ||
      extracted.igAppId ||
      DEFAULT_IG_APP_ID,
    docId:
      process.env.INSTAGRAM_GQL_DOC_ID?.trim() || DEFAULT_GQL_DOC_ID,
  };
}

export function parseManualInstagramFeed(raw: unknown): InstagramFeedPost[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: InstagramFeedPost[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!url) return;
    const sc = shortcodeFromUrl(url);
    const imageRaw = typeof o.image === "string" ? o.image.trim() : "";
    const image =
      imageRaw ||
      (sc ? `/api/uploads/instagram/${sc}.jpg` : "");
    if (!image) return;
    out.push({
      id: `manual-${i}`,
      image,
      url,
      caption: typeof o.caption === "string" ? o.caption : "",
      is_video: Boolean(o.is_video),
    });
  });
  return out;
}
