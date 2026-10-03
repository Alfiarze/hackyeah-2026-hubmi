/**
 * Test silnika dopasowania na potocznych zapytaniach - uruchamiany bez przeglądarki.
 * Kompiluje moduły lib/ przez esbuild (bundlowany z Vite) i odpytuje je w Node.
 *
 *   node app/scripts/test_match.mjs  (z katalogu app: node scripts/test_match.mjs)
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = mkdtempSync(join(tmpdir(), "hubmi-"));
const entry = join(dir, "entry.ts");

writeFileSync(
  entry,
  `export { search, isGap, gapReason, buildIndex, analyzeQuery } from ${JSON.stringify(
    join(ROOT, "app/src/lib/match.ts").replace(/\\/g, "/"),
  )};
   export { INNOVATIONS } from ${JSON.stringify(
     join(ROOT, "app/src/lib/data.ts").replace(/\\/g, "/"),
   )};`,
);

const out = join(dir, "bundle.mjs");
await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  loader: { ".json": "json" },
  logLevel: "warning",
});

const m = await import("file://" + out.replace(/\\/g, "/"));
m.buildIndex(m.INNOVATIONS);

const QUERIES = [
  "mama mieszka sama na wsi i nie ma z kim pogadać",
  "babcia zapomina, gubi się w domu, coraz gorzej z pamięcią",
  "u nas w gminie nie ma nic dla młodzieży po szkole, nudzą się i piją",
  "jestem na wózku i nie mogę wejść do urzędu, wszędzie schody",
  "syn ma autyzm i boi się wychodzić z domu",
  "głucha pacjentka nie dogada się w przychodni",
  "potrzebuję pomysłu na hodowlę pstrąga w stawie hodowlanym",
];

for (const q of QUERIES) {
  const { analysis, results } = m.search(q, { limit: 3 });
  console.log("\n" + "=".repeat(78));
  console.log("PYTANIE: " + q);
  console.log(
    "  wątki: " + (analysis.concepts.map((c) => c.label).join(" · ") || "(żadnych)"),
  );
  if (analysis.unknown.length) {
    console.log("  nierozpoznane: " + analysis.unknown.slice(0, 6).join(", "));
  }
  const gr = m.gapReason(analysis, results);
  if (gr) {
    console.log("  >> LUKA (" + gr + ") - trafia do widoku niezaspokojonych potrzeb");
  }
  for (const r of results) {
    console.log(
      `  [${String(r.score).padStart(3)}/100 ${r.tier} cov=${r.coverage.toFixed(2)}] ${r.innovation.name}` +
        `  (${r.innovation.catName})`,
    );
    console.log(
      "        pokrywa: " +
        (r.matched.map((x) => x.label).join(", ") || "-") +
        (r.missed.length ? "  | nie pokrywa: " + r.missed.map((x) => x.label).join(", ") : ""),
    );
    if (r.reasons[0]) console.log("        → " + r.reasons[0]);
  }
}
console.log();
