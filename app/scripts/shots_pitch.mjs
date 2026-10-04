/**
 * Zrzuty pod prezentację (Marp), a nie pod przegląd wizualny.
 *
 * Różnica wobec `shots.mjs`: tam `fullPage: true`, bo chodzi o komplet widoku
 * do zgłoszenia. Tu kadr jest **sztywny 1440×900**, bo zrzut ma wejść na slajd
 * 16:9 — zrzut Biblioteki na pełnej wysokości to ~30 000 px i na slajdzie
 * zostaje z niego pasek pikseli.
 *
 * Wyjście: `docs/screenshots/pitch/`. Uruchamiaj przy działającym froncie
 * (dev 5173 albo preview 4173) **i działającym backendzie** — moduł I nie ma
 * trybu offline, więc bez API zrzut wyników byłby ekranem błędu.
 *
 *   AUDIT_URL=http://localhost:5173 node scripts/shots_pitch.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "..", "docs", "screenshots", "pitch");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.AUDIT_URL ?? "http://localhost:4173";

/** Przeprowadza rozmowę modułu I do wyników: kamyk → Szukaj → odpowiedzi. */
async function doWynikow(p) {
  await p.getByRole("button", { name: "Osoby starsze" }).click();
  await p.getByRole("button", { name: "Szukaj" }).click();
  for (let i = 0; i < 3; i++) {
    const chips = p.locator('[aria-label="Szybkie odpowiedzi"] button');
    if ((await chips.count()) === 0) break;
    await chips.first().click();
    await p.waitForTimeout(250);
  }
  await p.locator(".mm__summary").first().waitFor({ timeout: 15000 });
  await p.waitForTimeout(1200);
}

const SHOTS = [
  { n: "p1-matchmaking-start", r: "matchmaking" },

  // Wyniki: kadr na kartach, nie na rozmowie powyżej.
  { n: "p2-wyniki", r: "matchmaking", setup: async (p) => {
      await doWynikow(p);
      await p.locator("section.results").first().scrollIntoViewIfNeeded();
      await p.waitForTimeout(700);
    } },

  // „Dlaczego to pasuje" — rozwinięte uzasadnienie pierwszego trafienia.
  { n: "p3-dlaczego-pasuje", r: "matchmaking", setup: async (p) => {
      await doWynikow(p);
      const why = p.locator("section.why").first();
      await why.scrollIntoViewIfNeeded();
      // kadr nieco wyżej, żeby nad uzasadnieniem był widoczny tytuł karty
      await p.mouse.wheel(0, -220);
      await p.waitForTimeout(700);
    } },

  // Mapa wdrożeń — dowód na „gdzie już to zrobiono".
  { n: "p4-mapa", r: "matchmaking", setup: async (p) => {
      await doWynikow(p);
      const map = p.locator("figure.map").first();
      await map.scrollIntoViewIfNeeded();
      await p.mouse.wheel(0, -160);
      await p.waitForTimeout(700);
    } },

  { n: "p5-middleman", r: "middleman", setup: async (p) => {
      const opt = p.locator(".ts__option").first();
      await opt.click({ timeout: 4000 }).catch(() => {});
      await p.waitForTimeout(1500);
      await p.locator("[class*='mi__list']").first().scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(400);
    } },

  { n: "p6-admin-trendy", r: "admin", setup: async (p) => {
      await p.getByRole("tab", { name: /potrzeby i trendy/ }).click();
      await p.waitForTimeout(900);
    } },

  { n: "p7-biblioteka", r: "biblioteka" },

  { n: "p8-kreator", r: "kreator" },

  { n: "p9-wysoki-kontrast", r: "matchmaking", setup: async (p) => {
      await p.getByRole("button", { name: /Wysoki kontrast/ }).first().click();
      await p.waitForTimeout(500);
    } },

  { n: "p10-duza-czcionka", r: "matchmaking", setup: async (p) => {
      await p.getByRole("button", { name: /bardzo duża/i }).first().click();
      await p.waitForTimeout(500);
    } },
];

const b = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/#${s.r}`, { waitUntil: "networkidle" });
  // 900 ms: karty wjeżdżają przez 600 ms — bez tego zrzuty wychodzą wyblakłe.
  await p.waitForTimeout(900);
  if (s.setup) {
    try { await s.setup(p); } catch (e) { console.warn(`  ${s.n}: ${e.message.split("\n")[0]}`); }
  }
  await p.screenshot({ path: join(OUT, `${s.n}.png`), timeout: 60000 });
  console.log(`✓ ${s.n}.png`);
  await ctx.close();
}
await b.close();
console.log(`\nZrzuty w docs/screenshots/pitch/`);
