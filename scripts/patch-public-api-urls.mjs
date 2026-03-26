/**
 * Una sola pasada: envuelve rutas /api/... en api() donde corresponde.
 * Excluye webhooks MP y archivos que no deben tocarse.
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src");

const SKIP_FILES = new Set([
  path.join(ROOT, "lib", "public-api.ts").replace(/\\/g, "/"),
  path.join(ROOT, "lib", "base-url.ts").replace(/\\/g, "/"),
]);

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(p);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      yield p;
    }
  }
}

function shouldSkipLine(line) {
  if (line.includes("/api/webhooks")) return true;
  if (line.includes("getWebhookUrl")) return true;
  if (line.includes("REL_DIR =") && line.includes("/api/")) return true;
  if (line.includes("REL_PREFIX =") && line.includes("/api/")) return true;
  if (line.includes("LESSON_UPLOAD_VIDEO_PREFIX")) return true;
  if (line.includes("API_PREFIX =") && line.includes("/api/uploads")) return true;
  return false;
}

function patchContent(raw) {
  const lines = raw.split("\n");
  const out = lines.map((line) => {
    if (shouldSkipLine(line)) return line;
    return line;
  });
  let s = out.join("\n");

  // fetch("...") con /api/
  s = s.replace(/fetch\(\s*"(\/api\/[^"]+)"\s*\)/g, 'fetch(api("$1"))');
  s = s.replace(/fetch\(\s*"(\/api\/[^"]+)"\s*,/g, 'fetch(api("$1"),');

  // fetch(`...`) — admite ${...} dentro del path
  s = s.replace(
    /fetch\(\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*\)/g,
    "fetch(api(`$1`))"
  );
  s = s.replace(
    /fetch\(\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*,/g,
    "fetch(api(`$1`),"
  );

  s = s.replace(/await fetch\(\s*"(\/api\/[^"]+)"\s*\)/g, 'await fetch(api("$1"))');
  s = s.replace(/await fetch\(\s*"(\/api\/[^"]+)"\s*,/g, 'await fetch(api("$1"),');
  s = s.replace(
    /await fetch\(\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*\)/g,
    "await fetch(api(`$1`))"
  );
  s = s.replace(
    /await fetch\(\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*,/g,
    "await fetch(api(`$1`),"
  );

  // href={`/api/...`}
  s = s.replace(/href=\{\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*\}/g, "href={api(`$1`)}");

  // href={"/api/..."}
  s = s.replace(/href=\{\s*"(\/api\/[^"]+)"\s*\}/g, 'href={api("$1")}');

  // src={`/api/...`}
  s = s.replace(/src=\{\s*`(\/api\/(?:[^$`]|(\$\{[^}]+\}))+)`\s*\}/g, "src={api(`$1`)}");

  // return `/api/...` (simple, una línea)
  s = s.replace(/return\s+`(\/api\/[^`]+)`;/g, "return api(`$1`);");
  s = s.replace(/return\s+"(\/api\/[^"]+)";/g, 'return api("$1");');

  return s;
}

function needsApiImport(content) {
  return /\bapi\s*\(\s*[`"'/]/.test(content);
}

function ensureImport(content, fp) {
  if (!needsApiImport(content)) return content;
  if (content.includes('@/lib/public-api"') || content.includes("@/lib/public-api'"))
    return content;
  const lines = content.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) insertAt = i + 1;
    else if (lines[i].trim() === "" && insertAt > 0) break;
    else if (!lines[i].startsWith("import ") && lines[i].trim() !== "") break;
  }
  const imp = 'import { api } from "@/lib/public-api";';
  if (lines.some((l) => l.includes(imp))) return content;
  lines.splice(insertAt, 0, imp);
  return lines.join("\n");
}

let changed = 0;
for (const fp of walk(ROOT)) {
  const norm = fp.split(path.sep).join("/");
  if ([...SKIP_FILES].some((sk) => norm.endsWith(sk.replace(/.*\/src\//, "src/"))))
    continue;

  let raw = fs.readFileSync(fp, "utf8");
  if (!raw.includes("/api/")) continue;

  const patched = patchContent(raw);
  if (patched === raw) continue;

  const withImport = ensureImport(patched, fp);
  fs.writeFileSync(fp, withImport, "utf8");
  changed++;
  console.log("patched", norm);
}
console.log("done, files changed:", changed);
