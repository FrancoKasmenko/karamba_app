import fs from "fs";
import path from "path";

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(p);
    } else if (e.name.endsWith(".tsx")) yield p;
  }
}

for (const fp of walk(path.join(process.cwd(), "src"))) {
  const c = fs.readFileSync(fp, "utf8");
  const lines = c.split("\n");
  if (
    lines[0]?.startsWith('import { api } from "@/lib/public-api"') &&
    lines[1] === '"use client";'
  ) {
    const rest = lines.slice(2);
    fs.writeFileSync(
      fp,
      ['"use client";', lines[0], ...rest].join("\n"),
      "utf8"
    );
    console.log("fixed", fp);
  }
}
