/**
 * Test E2E warstwy „wow" na żywym stosie (http://localhost:8088):
 * hero z paskiem liczb → rozpoznawanie wątków W TRAKCIE pisania (instant)
 * → rozmowa → wyniki z dwufazowym werdyktem AI (shimmer → pop).
 *
 *   docker compose -p hubmi up -d   (web na 8088, backend na 8001)
 *   node scripts/test_wow.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.WOW_URL ?? "http://localhost:8088";
const SHOTS = join(tmpdir(), "opencode");
mkdirSync(SHOTS, { recursive: true });

const fails = [];
const check = (cond, label) => {
  console.log(`  ${cond ? "OK  " : "FAIL"}  ${label}`);
  if (!cond) fails.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => fails.push(`pageerror: ${e.message}`));

console.log("1. Hero — teza, lede i pasek liczb:");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".hero__lede");
check(await page.getByRole("heading", { level: 1 }).getByText(/Opisz problem/).isVisible(), "h1 z tezą");
check(await page.locator(".hero__lede").isVisible(), "lede pod tezą");
await page.waitForFunction(
  () => [...document.querySelectorAll(".hero__stat strong")].some((el) => el.textContent === "115"),
  { timeout: 4000 },
).catch(() => {});
const stats = await page.locator(".hero__stat").allTextContents();
check(stats.length === 3, `pasek 3 liczb (${stats.map((s) => s.trim().split("\n")[0]).join(", ")})`);
check(await page.locator(".mm__how-steps li").count() === 3, "3 kroki „jak to działa");

console.log("2. Instant: wątki rozpoznane w trakcie pisania:");
await page.locator("#mm-input").click();
await page.locator("#mm-input").fill("mama mieszka sama na wsi");
await page.waitForSelector(".mm__live-list li", { timeout: 2000 });
const chips = await page.locator(".mm__live-list li").allTextContents();
check(chips.length >= 2, `chipsy na żywo: ${chips.join(" · ")}`);
await page.screenshot({
  path: join(SHOTS, "hubmi-wow-typing.png"),
  clip: { x: 0, y: 0, width: 1440, height: 760 },
});

console.log("3. Rozmowa i wyniki z werdyktem AI:");
await page.locator("#mm-input").fill("mama mieszka sama na wsi i nie ma z kim pogadać");
await page.getByRole("button", { name: "Szukaj", exact: true }).click();
for (let i = 0; i < 4; i++) {
  const quick = page.locator('[aria-label="Szybkie odpowiedzi"] button');
  if ((await quick.count()) === 0) break;
  await quick.first().click();
  await page.waitForTimeout(250);
}
await page.waitForSelector(".results .fiszka", { timeout: 20000 });
const cards = await page.locator(".results .fiszka").count();
check(cards >= 1, `wyniki: ${cards} fiszek`);
// Werdykty odsłaniają się kaskadowo (500 + i*280 ms po wejściu wyników).
await page.waitForSelector(".fiszka__ai-verdict--reveal", { timeout: 8000 });
const verdicts = await page.locator(".fiszka__ai-verdict--reveal").count();
check(verdicts >= 1, `odsłonięte werdykty: ${verdicts}`);
const icons = await page.locator(".fiszka__ai-ico").allTextContents();
check(
  icons.every((t) => ["✓", "△", "○"].includes(t.trim())),
  `ikony werdyktów kształtem: ${icons.join(" ")}`,
);
const label = await page.locator(".fiszka__ai-verdict--reveal .eyebrow").first().textContent();
check(/Weryfikacja AI|Diagnoza powiązania/.test(label ?? ""), `etykieta werdyktu: ${(label ?? "").trim()}`);
await page.screenshot({
  path: join(SHOTS, "hubmi-wow-results.png"),
  fullPage: false,
});

await browser.close();
console.log(
  fails.length === 0
    ? "\nWow działa: instant-rozpoznawanie + dwufazowy werdykt na żywym stosie."
    : `\nProblemy: ${fails.join("; ")}`,
);
process.exitCode = fails.length === 0 ? 0 : 1;
