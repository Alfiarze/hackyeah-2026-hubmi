/** Zrzuty wszystkich widoków do przeglądu wizualnego i do zgłoszenia. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "..", "docs", "screenshots");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.AUDIT_URL ?? "http://localhost:4173";

const SHOTS = [
  { n: "01-matchmaking-start", r: "matchmaking" },
  { n: "02-matchmaking-wyniki", r: "matchmaking", setup: async (p) => {
      // kamyk „Osoby starsze” wpisuje gotowy opis, „Szukaj” wysyła wypowiedź
      await p.getByRole("button", { name: "Osoby starsze" }).click();
      await p.getByRole("button", { name: "Szukaj" }).click();
      for (let i = 0; i < 3; i++) {
        const chips = p.locator('[aria-label="Szybkie odpowiedzi"] button');
        if ((await chips.count()) === 0) break;
        await chips.first().click();
        await p.waitForTimeout(250);
      }
      await p.locator(".mm__summary").first().waitFor({ timeout: 8000 });
    } },
  { n: "03-biblioteka", r: "biblioteka" },
  { n: "04-kreator", r: "kreator" },
  { n: "05-tester", r: "tester" },
  { n: "06-komunikacja", r: "komunikacja" },
  { n: "07-admin-skrzynka", r: "admin" },
  { n: "08-admin-trendy", r: "admin", setup: async (p) => {
      await p.getByRole("tab", { name: /potrzeby i trendy/ }).click();
      await p.waitForTimeout(500);
    } },
  { n: "09-middleman", r: "middleman", setup: async (p) => {
      await p.getByRole("button", { name: /BaWita/ }).first().click().catch(() => {});
      await p.waitForTimeout(300);
    } },
  { n: "10-dostepnosc", r: "dostepnosc" },
  { n: "11-wysoki-kontrast", r: "matchmaking", setup: async (p) => {
      await p.getByRole("button", { name: /Wysoki kontrast/ }).first().click();
      await p.waitForTimeout(300);
    } },
  { n: "12-duza-czcionka", r: "matchmaking", setup: async (p) => {
      await p.getByRole("button", { name: /bardzo duża/i }).first().click();
      await p.waitForTimeout(300);
    } },
];

const b = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/#${s.r}`, { waitUntil: "networkidle" });
  // 900 ms: karty wjeżdżają przez 600 ms — bez tego zrzuty wychodzą wyblakłe.
  await p.waitForTimeout(900);
  if (s.setup) { try { await s.setup(p); } catch (e) { console.warn(`  ${s.n}: ${e.message.split("\n")[0]}`); } }
  // Biblioteka to ~30 000 px pionu przy deviceScaleFactor 2 — render z tego
  // bywa dłuższy niż domyślnych 30 s.
  await p.screenshot({ path: join(OUT, `${s.n}.png`), fullPage: true, timeout: 90000 });
  console.log(`✓ ${s.n}`);
  await ctx.close();
}
// mobile
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, "13-mobile.png"), fullPage: true });
console.log("✓ 13-mobile");
await b.close();
