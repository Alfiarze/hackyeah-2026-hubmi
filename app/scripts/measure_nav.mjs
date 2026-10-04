/**
 * Pomiar pasa nawigacji: czy sześć pełnych etykiet modułów mieści się bez
 * ukrytego przewijania (scrollbar ukryty = dla użytkownika ucięte pozycje),
 * czy nagłówek nie łamie się na dwa wiersze i czy strona nie przewija się
 * w poziomie (WCAG 1.4.10).
 *
 *   npm run build && npm run preview &
 *   node scripts/measure_nav.mjs
 *
 * Rozmiary: laptopy (1280-1600), desktop (1920), poniżej progu pełnych
 * etykiet (76rem = 1216 px) oraz telefony.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.NAV_URL ?? "http://localhost:4173";
const SHOTS = join(tmpdir(), "opencode");
mkdirSync(SHOTS, { recursive: true });

const SIZES = [
  [1100, 800], // pod progiem - krótkie etykiety
  [1280, 800], // laptop 13"
  [1366, 768], // laptop 14" (klasyczny)
  [1440, 900], // laptop 15"
  [1600, 900],
  [1920, 1080], // desktop
  [390, 844], // telefon
];

const browser = await chromium.launch();
const rows = [];

for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const ul = document.querySelector(".hdr__nav ul");
    const inner = document.querySelector(".hdr__inner");
    const bar = document.querySelector(".a11ybar__inner");
    const full = document.querySelector(".hdr__full");
    return {
      fullLabels: full ? getComputedStyle(full).display !== "none" : null,
      navOverflow: ul ? ul.scrollWidth - ul.clientWidth : null,
      hdrHeight: inner ? Math.round(inner.getBoundingClientRect().height) : null,
      barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : null,
      pageX:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  // Desktop: pełne etykiety bez przewijania i bez poziomego scrolla strony.
  // Telefon (≤48rem): nagłówek celowo idzie na dwa wiersze, a lista modułów
  // przewija się wewnątrz swojego wiersza - liczy się tylko brak scrolla
  // na poziomie całej strony (WCAG 1.4.10 Reflow).
  const mobile = w <= 768;
  const ok = m.pageX <= 1 && (mobile || (m.navOverflow <= 1 && m.hdrHeight <= 80));
  rows.push(
    `${String(w).padStart(4)}x${h}  ${m.fullLabels ? "pelne " : "krotkie"}  ` +
      `navDelta=${String(m.navOverflow).padStart(4)}px  hdr=${m.hdrHeight}px  ` +
      `a11ybar=${m.barHeight}px  pageX=${m.pageX}px  ${ok ? "OK" : "DO POPRAWY"}`,
  );

  if (w === 1440 || w === 1366 || w === 1920) {
    await page.screenshot({
      path: join(SHOTS, `hubmi-header-${w}.png`),
      clip: { x: 0, y: 0, width: w, height: 150 },
    });
  }
  await page.close();
}

await browser.close();
console.log(rows.join("\n"));
console.log(`\nZrzuty naglowka: ${SHOTS}`);
