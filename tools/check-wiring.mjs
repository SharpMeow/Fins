/* The layers are plain <script> tags. Nothing builds them, nothing resolves
   them, and nothing notices when the list and the folder disagree.

   Three ways that goes wrong, all of which have to be caught before the page
   is opened rather than after:

     1. index.html asks for a file that is not there. The tag 404s, the layer
        never runs, and the game carries on without it.
     2. A layer exists and no tag loads it. It is a file nobody runs. The
        module order in index.html is the only list of what is in the build.
     3. A layer changed and its ?v= did not. Returning players hold the cached
        copy and the fix does not reach them. Only checked against a base ref,
        so it runs on a pull request and stays quiet elsewhere. */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const GAME = "game";
const INDEX = join(GAME, "index.html");
const base = process.argv[2] || "";
const problems = [];

const html = readFileSync(INDEX, "utf8");
const tags = [...html.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g)]
  .map((m) => m[1])
  .filter((src) => !/^https?:/.test(src));

const wired = new Map();
for (const src of tags) {
  const [file, query = ""] = src.split("?");
  wired.set(file, query);
}

const onDisk = readdirSync(GAME).filter((f) => f.endsWith(".js"));

for (const file of wired.keys()) {
  if (!onDisk.includes(file)) problems.push(`index.html loads ${file}, which is not in ${GAME}/`);
}
for (const file of onDisk) {
  if (!wired.has(file)) problems.push(`${GAME}/${file} exists but no <script> tag loads it`);
}

if (base) {
  let changed = [];
  try {
    changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    console.log(`  (no diff against ${base}; skipping the cache-bust check)`);
  }
  if (changed.length) {
    const indexChanged = changed.includes(INDEX);
    const oldHtml = indexChanged
      ? execFileSync("git", ["show", `${base}:${INDEX}`], { encoding: "utf8" })
      : html;
    const oldQuery = (file) => {
      const m = oldHtml.match(new RegExp(`<script\\s+src="${file.replace(".", "\\.")}\\?([^"]*)"`));
      return m ? m[1] : null;
    };
    for (const path of changed) {
      if (!path.startsWith(`${GAME}/`) || !path.endsWith(".js")) continue;
      const file = path.slice(GAME.length + 1);
      if (!wired.has(file)) continue;
      const now = wired.get(file);
      const before = oldQuery(file);
      if (before !== null && before === now) {
        problems.push(
          `${path} changed but its cache-bust in index.html is still ?${now}. ` +
            `Anyone holding the old copy keeps it.`
        );
      }
    }
  }
}

if (problems.length) {
  console.error("Wiring:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Wiring: ${wired.size} layers loaded, ${onDisk.length} on disk, all accounted for.`);
