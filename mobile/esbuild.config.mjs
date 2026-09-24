import { build, context } from "esbuild";
import { cpSync, mkdirSync, existsSync } from "node:fs";

const watch = process.argv.includes("--watch");

function copyStaticAssets() {
  mkdirSync("www/assets", { recursive: true });
  cpSync("src/index.html", "www/index.html");
  cpSync("src/styles.css", "www/styles.css");
  cpSync("src/fonts.css", "www/fonts.css");
  // Typefaces are bundled (no Google Fonts request from the device).
  mkdirSync("www/fonts", { recursive: true });
  for (const [family, weights] of [["fredoka", [500, 600, 700]], ["inter", [400, 500, 600, 700]]]) {
    for (const weight of weights) {
      for (const subset of ["latin", "latin-ext"]) {
        const file = `${family}-${subset}-${weight}-normal.woff2`;
        cpSync(`node_modules/@fontsource/${family}/files/${file}`, `www/fonts/${file}`);
      }
    }
  }
  // data.js stays a plain global script (not bundled) — app.js reads its
  // globals directly, exactly as it did before the bundler existed.
  cpSync("src/data.js", "www/data.js");
  if (existsSync("src/assets")) {
    cpSync("src/assets", "www/assets", { recursive: true });
  }
  // jeep-sqlite's web fallback needs the sql.js wasm binary served as a
  // static asset (see mobile/src/db.js initWebStore()).
  const wasmSrc = "node_modules/sql.js/dist/sql-wasm.wasm";
  if (existsSync(wasmSrc)) {
    cpSync(wasmSrc, "www/assets/sql-wasm.wasm");
  }

  // jeep-sqlite itself, served locally (not from a CDN) so the app has zero
  // network dependency, matching the "fully offline" requirement — the whole
  // dist/jeep-sqlite/ folder is needed since its ESM entry lazy-loads sibling
  // chunk files by relative path.
  const jeepSrc = "node_modules/jeep-sqlite/dist/jeep-sqlite";
  if (existsSync(jeepSrc)) {
    cpSync(jeepSrc, "www/assets/jeep-sqlite", { recursive: true });
  }
}

const buildOptions = {
  entryPoints: ["src/app.js"],
  bundle: true,
  outfile: "www/app.bundle.js",
  format: "iife",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
  logLevel: "info",
};

copyStaticAssets();

if (watch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("esbuild watching mobile/src for changes...");
} else {
  await build(buildOptions);
  console.log("Build complete → mobile/www/app.bundle.js");
}
