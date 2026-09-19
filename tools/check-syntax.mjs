/* Parse every file that ships. The layers are loaded as plain <script> tags,
   so a stray bracket in one of them is not a build error, it is a black page
   with one line in a console nobody has open. */
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const dirs = ["game", "desktop", "tools"];
const files = [];
for (const dir of dirs) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  for (const f of entries) {
    if (/\.(js|cjs|mjs)$/.test(f)) files.push(join(dir, f));
  }
}

const broken = [];
for (const f of files) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    broken.push(`${f}\n${String(e.stderr || e.message).trim().split("\n").slice(0, 4).join("\n")}`);
  }
}

if (broken.length) {
  console.error("Syntax:");
  for (const b of broken) console.error(`  ${b.replace(/\n/g, "\n    ")}`);
  process.exit(1);
}
console.log(`Syntax: ${files.length} files parse.`);
