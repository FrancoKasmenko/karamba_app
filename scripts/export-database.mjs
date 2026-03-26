#!/usr/bin/env node
/**
 * Exporta la base PostgreSQL definida en DATABASE_URL a database.sql en la raíz del repo.
 *
 * Uso:
 *   npm run db:export
 *
 * Windows sin PostgreSQL en el PATH:
 * - Busca pg_dump.exe en ...\PostgreSQL\<v>\bin y en ...\PostgreSQL\<v>\pgAdmin 4\runtime
 * - O definí carpeta (runtime) o .exe con PG_DUMP_PATH
 *
 * Si la DB corre en Docker:
 *   docker exec -t <contenedor> pg_dump -U <usuario> <database> > database.sql
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outFile = join(root, "database.sql");

function loadDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;

  const envPath = join(root, ".env");
  if (!existsSync(envPath)) {
    console.error(
      "No hay DATABASE_URL en el entorno ni archivo .env en la raíz del proyecto."
    );
    process.exit(1);
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }

  console.error("DATABASE_URL no está definido en .env");
  process.exit(1);
}

/**
 * Prisma agrega parámetros en la URI (p. ej. ?schema=public) que libpq/pg_dump
 * no reconocen y fallan con "parámetro de URI no válido".
 */
function sanitizeDatabaseUrlForPgDump(urlString) {
  const stripKeys = new Set([
    "schema",
    "connection_limit",
    "pool_timeout",
    "pgbouncer",
    "sslaccept",
  ]);
  try {
    const u = new URL(urlString);
    for (const key of [...u.searchParams.keys()]) {
      if (stripKeys.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    let out = u.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch {
    return urlString;
  }
}

/** Ruta a la carpeta bin de una instalación típica de PostgreSQL en Windows. */
function findPgDumpWindows() {
  const roots = [
    join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL"),
    join(
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
      "PostgreSQL"
    ),
  ];

  const candidates = [];

  for (const pgRoot of roots) {
    if (!existsSync(pgRoot)) continue;
    let entries;
    try {
      entries = readdirSync(pgRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const verNum = parseInt(ent.name, 10) || 0;
      const tries = [
        { path: join(pgRoot, ent.name, "bin", "pg_dump.exe"), preferBin: true },
        {
          path: join(
            pgRoot,
            ent.name,
            "pgAdmin 4",
            "runtime",
            "pg_dump.exe"
          ),
          preferBin: false,
        },
      ];
      for (const { path: exe, preferBin } of tries) {
        try {
          if (statSync(exe).isFile()) {
            candidates.push({ exe, ver: verNum, preferBin });
          }
        } catch {
          /* sigue */
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.ver !== a.ver) return b.ver - a.ver;
    if (a.preferBin !== b.preferBin) return a.preferBin ? -1 : 1;
    return 0;
  });
  return candidates[0].exe;
}

function resolvePgDumpExecutable(customRaw) {
  let p = customRaw.trim();
  if (!existsSync(p)) {
    console.error("PG_DUMP_PATH no existe:", p);
    process.exit(1);
  }
  const st = statSync(p);
  if (st.isDirectory()) {
    const inside = join(p, "pg_dump.exe");
    if (!existsSync(inside) || !statSync(inside).isFile()) {
      console.error(
        "PG_DUMP_PATH es una carpeta pero no contiene pg_dump.exe:",
        p
      );
      process.exit(1);
    }
    p = inside;
  } else if (!st.isFile()) {
    console.error("PG_DUMP_PATH no es un archivo ni carpeta válidos:", p);
    process.exit(1);
  }
  return p;
}

function resolvePgDumpCommand() {
  const custom = process.env.PG_DUMP_PATH?.trim();
  if (custom) {
    return resolvePgDumpExecutable(custom);
  }

  if (process.platform === "win32") {
    const found = findPgDumpWindows();
    if (found) {
      console.log("Usando:", found);
      return found;
    }
  }

  return "pg_dump";
}

const rawDatabaseUrl = loadDatabaseUrl();
if (!/^postgres(ql)?:\/\//i.test(rawDatabaseUrl)) {
  console.error("DATABASE_URL no parece una URI de PostgreSQL.");
  process.exit(1);
}

const databaseUrl = sanitizeDatabaseUrlForPgDump(rawDatabaseUrl);

const pgDump = resolvePgDumpCommand();

console.log("Exportando a", outFile);

const args = [
  databaseUrl,
  "-f",
  outFile,
  "-F",
  "p",
  "--encoding=UTF8",
  "--no-owner",
  "--no-acl",
];

const result = spawnSync(pgDump, args, {
  stdio: "inherit",
  env: { ...process.env },
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  console.error(`
No se encontró pg_dump. Opciones en Windows:

  1) Instalá PostgreSQL (incluye pg_dump) desde:
     https://www.postgresql.org/download/windows/

  2) O indicá la carpeta runtime de pgAdmin o el .exe:
     set PG_DUMP_PATH=C:\\Program Files\\PostgreSQL\\18\\pgAdmin 4\\runtime
     npm run db:export

  3) Si usás Docker para la base:
     docker exec -t NOMBRE_CONTENEDOR pg_dump -U USUARIO NOMBRE_BD > database.sql
`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Listo:", outFile);
