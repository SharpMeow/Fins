/* The layers live in src/layers/ and are bundled in the order src/pre.mjs and src/post.mjs import
   them. Nothing resolves that list against the folder, so this does:

     1. Every file in src/layers/ is imported by exactly one entry, exactly once. A layer nobody
        imports is a file nobody runs; one imported twice runs twice.
     2. Every import in an entry points at a file that is there.
     3. index.html loads only files that exist in game/, and every script in game/ is loaded.
     4. Each script tag's ?v= is the hash of the file it loads, so a returning player's cached copy
        is replaced the moment the file changes. tools/build.mjs writes these; this catches a file
        replaced (fins.js, say) without a rebuild.

   Whether the committed bundles match src/ is tools/build.mjs --check. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const GAME = "game";
const LAYERS = "src/layers";
const ENTRIES = ["src/pre.mjs", "src/post.mjs"];
const problems = [];

const imported = new Map();
for (const entry of ENTRIES) {
  const text = readFileSync(entry, "utf8");
  for (const m of text.matchAll(/^import\s+"\.\/layers\/([^"]+)";/gm)) {
    const file = m[1];
    if (!existsSync(join(LAYERS, file))) problems.push(`${entry} imports layers/${file}, which is not in ${LAYERS}/`);
    if (imported.has(file)) problems.push(`layers/${file} is imported twice (${imported.get(file)} and ${entry})`);
    else imported.set(file, entry);
  }
  const other = text.split("\n").filter((l) => /^\s*import\b/.test(l) && !/^import\s+"\.\/layers\/[^"]+";$/.test(l));
  for (const l of other) problems.push(`${entry} has an import this check does not understand: ${l.trim()}`);
}
for (const file of readdirSync(LAYERS).filter((f) => f.endsWith(".js"))) {
  if (!imported.has(file)) problems.push(`${LAYERS}/${file} exists but no entry imports it`);
}

const html = readFileSync(join(GAME, "index.html"), "utf8");
const tags = [...html.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g)]
  .map((m) => m[1])
  .filter((src) => !/^https?:/.test(src));
const loaded = new Set();
for (const src of tags) {
  const [file, query = ""] = src.split("?");
  loaded.add(file);
  const path = join(GAME, file);
  if (!existsSync(path)) {
    problems.push(`index.html loads ${file}, which is not in ${GAME}/`);
    continue;
  }
  const want = "v=" + createHash("sha256").update(readFileSync(path, "utf8")).digest("hex").slice(0, 10);
  if (query !== want) problems.push(`index.html loads ${file}?${query}, but the file is ?${want} now. Run npm run build.`);
}
for (const file of readdirSync(GAME).filter((f) => f.endsWith(".js"))) {
  if (!loaded.has(file)) problems.push(`${GAME}/${file} exists but no <script> tag loads it`);
}

if (problems.length) {
  console.error("Wiring:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Wiring: ${imported.size} layers imported once each, ${tags.length} scripts loaded, every ?v= current.`);
