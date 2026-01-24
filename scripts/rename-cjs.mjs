import { readdir, rename, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CJS_DIR = join(__dirname, "../dist/cjs");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    // Skip type files
    if (
      entry.name.endsWith(".d.ts") ||
      entry.name.endsWith(".d.ts.map")
    ) {
      continue;
    }

    if (extname(entry.name) === ".js") {
      const newPath = fullPath.replace(/\.js$/, ".cjs");

      // Read & rewrite requires if needed
      let content = await readFile(fullPath, "utf8");

      content = content.replace(
        /require\((["'])(\.\/.*?)(?:\.js)?\1\)/g,
        'require($1$2.cjs$1)'
      );

      await writeFile(fullPath, content);
      await rename(fullPath, newPath);
    }
  }
}

await walk(CJS_DIR);

console.log("✔ CJS files renamed to .cjs");
