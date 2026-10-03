/**
 * Sprawdzenie warstwy "spoza Małopolski" bez przeglądarki:
 * czy karty z innych baz są domyślnie wycięte z wyników, czy wchodzą po
 * `external: true`, czy noszą uzasadnienie o pochodzeniu i czy nie mają
 * wdrożeń w małopolskich powiatach.
 *
 *   node app/scripts/test_external.mjs   (z katalogu app: node scripts/test_external.mjs)
 */
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..").replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "hubmi-ext-"));
const entry = join(dir, "entry.ts");
const matchPath = ROOT + "/app/src/lib/match.ts";
const dataPath = ROOT + "/app/src/lib/data.ts";
writeFileSync(
  entry,
  `export { search, buildIndex } from ${JSON.stringify(matchPath)};\n` +
    `export { INNOVATIONS } from ${JSON.stringify(dataPath)};\n`,
);
const out = join(dir, "bundle.mjs");
await build({
  entryPoints: [entry],
  bundle: true,
  outfile: out,
  format: "esm",
  platform: "node",
  loader: { ".json": "json" },
  logLevel: "error",
});
const m = await import("file://" + out.replace(/\\/g, "/"));
m.buildIndex(m.INNOVATIONS);

const queries = [
  "samotny senior z demencją w małej gminie, brak opieki dziennej",
  "dziecko w spektrum autyzmu nie ma zajęć ruchowych w naszej gminie",
];
for (const q of queries) {
  console.log("\n########", q);
  for (const ext of [false, true]) {
    const r = m.search(q, { limit: 5, external: ext });
    console.log(`  --- external=${ext}`);
    for (const x of r.results) {
      console.log(
        `   ${String(x.score).padStart(3)} ${x.innovation.ext ? "[SPOZA]" : "[MALOPOLSKA]"} ` +
          `${x.innovation.name} | ${x.innovation.origin?.region ?? ""}`,
      );
    }
    const e = r.results.find((x) => x.innovation.ext);
    if (e) console.log("   uzasadnienie:", e.reasons.find((s) => s.includes("nie pochodzi")));
  }
}
console.log(
  "\nrazem:",
  m.INNOVATIONS.length,
  "| ext:",
  m.INNOVATIONS.filter((i) => i.ext).length,
  "| bez deployments:",
  m.INNOVATIONS.filter((i) => i.ext && i.deployments.length).length,
);
