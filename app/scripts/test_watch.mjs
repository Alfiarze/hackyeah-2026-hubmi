/**
 * Test pętli powrotu potrzeby (lib/watch.ts) bez backendu:
 * mieszkaniec obserwuje potrzebę → admin dodaje innowację →
 * mieszkańca przy powrocie na Matchmaking czeka powiadomienie z otwieraną
 * fiszką. Scenariusz dokładnie ten, który pokazujemy z roli admina.
 *
 *   npm run build && npm run preview &
 *   node scripts/test_watch.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.WATCH_URL ?? "http://localhost:4173";
const SHOTS = join(tmpdir(), "opencode");
mkdirSync(SHOTS, { recursive: true });

const WATCH_STATE = {
  watches: [
    {
      id: "mama mieszka sama na wsi i nie ma z kim pogadać",
      text: "mama mieszka sama na wsi i nie ma z kim pogadać",
      concepts: [
        { id: "samotnosc", label: "samotność i izolacja" },
        { id: "senior", label: "osoby starsze" },
      ],
      createdAt: Date.now(),
    },
  ],
  notices: [],
};

const fails = [];
const check = (cond, label) => {
  console.log(`  ${cond ? "OK  " : "FAIL"}  ${label}`);
  if (!cond) fails.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => fails.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "info") console.log("   [przegladarka]", m.text());
});

console.log("1. Mieszkaniec zakłada obserwację (seed stanu - backend odpowiada za wyszukiwanie):");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(
  (s) => localStorage.setItem("hubmi.watches.v1", s),
  JSON.stringify(WATCH_STATE),
);
// Reload jest konieczny tylko w teście: page.goto(#hash) to nawigacja
// same-document, wiec modul czyta localStorage dopiero przy pelnym ladowaniu.
await page.reload({ waitUntil: "networkidle" });

console.log("2. Rola admina: dodanie innowacji pasującej do obserwowanej potrzeby:");
await page.goto(`${BASE}#admin`, { waitUntil: "networkidle" });
// Domyślna zakładka panelu to „Skrzynka" - katalog siedzi w „Baza innowacji".
await page.getByRole("tab", { name: /Baza innowacji/ }).click();
await page.getByRole("button", { name: "+ Dodaj nową innowację" }).click();
await page.locator("#inn-name").fill("Klub rozmów: senior na wsi");
await page.locator("#inn-problem").fill(
  "Starsze osoby na obszarach wiejskich same w domach, bez kontaktu i towarzystwa, osamotnienie rośnie",
);
await page.locator("#inn-desc").fill(
  "Niedzielne spotkania w świetlicy z wolontariuszem, dowóz i rozmowa - metoda testowana w gminach powiatu krakowskiego",
);
await page.locator("form.card button[type=submit]").click();
await page.getByText(/została pomyślnie dodana/).waitFor({ timeout: 5000 });
check(await page.getByText(/została pomyślnie dodana/).isVisible(), "karta dodana w Panelu");
console.log(
  "   localStorage:",
  await page.evaluate(() => localStorage.getItem("hubmi.watches.v1")),
);

console.log("3. Powrót mieszkańca na Matchmaking - powinno czekać powiadomienie:");
await page.goto(`${BASE}#matchmaking`, { waitUntil: "networkidle" });
const banner = page.locator(".mm__notice");
await banner.waitFor({ timeout: 5000 });
check(await banner.getByText(/Klub rozmów/).isVisible(), "powiadomienie z nazwą nowej innowacji");
check(
  await banner.getByText(/mama mieszka sama na wsi/).isVisible(),
  "powiadomienie pamięta obserwowaną potrzebę",
);
await page.screenshot({
  path: join(SHOTS, "hubmi-watch-notice.png"),
  clip: { x: 0, y: 0, width: 1440, height: 520 },
});

console.log("4. Pokaż fiszkę rozwija pełną kartę, a odczyt trzymuje się po odświeżeniu:");
await banner.getByRole("button", { name: "Pokaż fiszkę" }).click();
check(
  await banner.locator("article.fiszka", { hasText: "Klub rozmów" }).isVisible(),
  "fiszka rozwinięta w miejscu",
);
await banner.getByRole("button", { name: "Zamknij powiadomienia" }).click();
check((await banner.count()) === 0, "powiadomienia zamknięte");
await page.reload({ waitUntil: "networkidle" });
check(
  (await page.locator(".mm__notice").count()) === 0,
  "odczyt się trzyma po odświeżeniu (persist)",
);

await browser.close();
console.log(
  fails.length === 0
    ? "\nWszystko gra - pętla działa offline (bez backendu)."
    : `\nProblemy: ${fails.join("; ")}`,
);
process.exitCode = fails.length === 0 ? 0 : 1;
