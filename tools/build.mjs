/* Bundle the layers in src/ into the two scripts game/ loads around fins.js, and stamp every local
   script tag in game/index.html with a hash of what it loads.

     node tools/build.mjs           write game/layers-pre.js, game/layers-post.js, game/index.html
     node tools/build.mjs --check   write nothing; fail if any of those is not what a build makes

   The layers used to be seventy-five <script> tags, each with a ?v= somebody had to remember to
   move. Now the order lives in src/pre.mjs and src/post.mjs, the bundles are committed so game/
   can still be served or packaged as it is, and --check in CI is what keeps the committed copies
   honest.

   Two things the old tags gave for free are kept on purpose:
   - Each layer runs in the order it is listed, as a plain classic script (format "iife"), with
     no change to when it runs.
   - A layer that throws while it starts takes down only itself. Each one is wrapped in its own
     try, opened on its first line so line numbers inside the layer do not move. */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const GAME = "game";
const INDEX = join(GAME, "index.html");
const TARGETS = [
  { entry: "src/pre.mjs", out: "layers-pre.js" },
  { entry: "src/post.mjs", out: "layers-post.js" },
];
/* The script tags index.html must carry, in this order. fins.js is not built here, but it is
   stamped like the others so that replacing it without rebuilding fails --check. */
const TAGS = ["layers-pre.js", "fins.js", "layers-post.js"];
const check = process.argv.includes("--check");

const isolate = {
  name: "isolate-layers",
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]layers[\\/][^\\/]+\.js$/ }, (args) => {
      const src = readFileSync(args.path, "utf8");
      const note = JSON.stringify(`Layer ${basename(args.path)} failed to start:`);
      return { contents: `try { ${src}\n} catch (e) {\n  console.error(${note}, e);\n}\n`, loader: "js" };
    });
  },
};

async function bundle({ entry, out }) {
  const r = await build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "esnext",
    charset: "utf8",
    write: false,
    logLevel: "warning",
    plugins: [isolate],
    banner: { js: `/* Built by tools/build.mjs from ${entry}. Do not edit: change src/ and run npm run build. */` },
  });
  if (r.warnings.length) throw new Error(`${entry}: esbuild warned; see above`);
  return { path: join(GAME, out), text: r.outputFiles[0].text };
}

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 10);

const outputs = [];
for (const t of TARGETS) outputs.push(await bundle(t));

const content = new Map(outputs.map((o) => [basename(o.path), o.text]));
content.set("fins.js", readFileSync(join(GAME, "fins.js"), "utf8"));

let html = readFileSync(INDEX, "utf8");
const found = [...html.matchAll(/<script src="([^"?]+)(\?[^"]*)?"><\/script>/g)].map((m) => m[1]);
if (found.join(",") !== TAGS.join(",")) {
  console.error(`Build: ${INDEX} must load exactly ${TAGS.join(", ")} in that order; it loads ${found.join(", ") || "nothing"}.`);
  process.exit(1);
}
for (const name of TAGS) {
  const tag = new RegExp(`<script src="${name.replace(/\./g, "\\.")}(\\?[^"]*)?"></script>`);
  html = html.replace(tag, `<script src="${name}?v=${hash(content.get(name))}"></script>`);
}
outputs.push({ path: INDEX, text: html });

if (check) {
  const stale = outputs.filter((o) => {
    try {
      return readFileSync(o.path, "utf8") !== o.text;
    } catch {
      return true;
    }
  });
  if (stale.length) {
    console.error("Build: these are not what the source builds to. Run npm run build and commit the result.");
    for (const o of stale) console.error(`  ${o.path}`);
    process.exit(1);
  }
  console.log(`Build: ${outputs.length} files match what src/ builds to.`);
} else {
  for (const o of outputs) writeFileSync(o.path, o.text);
  console.log(`Build: wrote ${outputs.map((o) => o.path).join(", ")}.`);
}
