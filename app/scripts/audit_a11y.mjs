/**
 * Audyt dostępności: Playwright + axe-core na każdym widoku aplikacji.
 *
 *   npm run build && npm run preview &   (albo npm run dev)
 *   npm run audit
 *
 * Wynik ląduje w src/data/audit.json i jest wyświetlany na stronie
 * „Dostępność", żeby liczby w interfejsie nie rozjechały się z rzeczywistością.
 *
 * Zestaw reguł: wcag2a + wcag2aa + wcag21a + wcag21aa - czyli dokładnie to,
 * czego wymaga zadanie, bez reguł „best-practice", które nie są częścią normy.
 */
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.AUDIT_URL ?? "http://localhost:4173";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const VIEWS = [
  { route: "matchmaking", label: "I - Matchmaking" },
  { route: "biblioteka", label: "II - Zasobnik wiedzy" },
  { route: "kreator", label: "III - Kreator pomysłów" },
  { route: "tester", label: "IV - Tester innowacji" },
  { route: "komunikacja", label: "V - Komunikacja" },
  { route: "admin", label: "VI - Panel administratora" },
  { route: "middleman", label: "VII - Middleman" },
  { route: "dostepnosc", label: "Dostępność" },
];

/** Widoki, które trzeba najpierw „rozwinąć", bo kluczowa treść jest za interakcją. */
const SETUP = {
  matchmaking: async (page) => {
    // Rozmowa musi dobiec do końca, inaczej audyt nie zobaczy ani wyników,
    // ani mapy, ani fiszek - czyli najważniejszej części tego widoku.
    // Opis wpisujemy wprost do pigułki, a nie kamykiem ze sterty: sterta jest
    // ukryta przy `prefers-reduced-motion` (zob. matchmaking.css), a audyt
    // chodzi właśnie w tym trybie — przez co scenariusz wyników cicho się nie
    // wykonywał i audytowany był sam ekran startowy.
    await page.fill("#mm-input", "Mama mieszka sama na wsi i nie ma z kim pogadać");
    // …a „Szukaj" wysyła pierwszą wypowiedź (asystent doprecyzowuje chipsami).
    await page.getByRole("button", { name: "Szukaj" }).click();
    for (let i = 0; i < 3; i++) {
      const chips = page.locator('[aria-label="Szybkie odpowiedzi"] button');
      if ((await chips.count()) === 0) break;
      await chips.first().click();
      await page.waitForTimeout(250);
    }
    // Podsumowanie (role=status) renderuje się i po sukcesie, i po błędzie
    // backendu - czekamy na nie, a nie na wyniki, żeby audyt działał też
    // bez podniesionego API.
    await page.locator(".mm__summary").first().waitFor({ timeout: 8000 });
  },
  admin: async (page) => {
    // druga zakładka to wykresy - audytujemy je razem ze skrzynką
    await page.getByRole("tab", { name: /potrzeby i trendy/ }).click();
    await page.waitForTimeout(400);
  },
  middleman: async (page) => {
    await page.getByRole("button", { name: /BaWita/ }).first().click().catch(() => {});
    await page.waitForTimeout(300);
  },
};

const run = async (page, route) => {
  await page.goto(`${BASE}/#${route}`, { waitUntil: "networkidle" });
  // 900 ms, nie 250: elementy [data-reveal] wjeżdżają przez 600 ms
  // (transition opacity), a axe mierzy kontrast z uwzględnieniem opacity -
  // audyt w połowie przejścia widziałby rozjaśnione kolory i fałszywie
  // płakał na pary, które po dojechaniu spełniają AA z zapasem.
  await page.waitForTimeout(900);
  if (SETUP[route]) {
    try {
      await SETUP[route](page);
    } catch (e) {
      console.warn(`  (setup ${route} pominięty: ${e.message.split("\n")[0]})`);
    }
  }
  await page.evaluate(AXE);
  return page.evaluate(
    async (tags) =>
      // bez resultTypes - potrzebujemy też liczby reguł zaliczonych,
      // inaczej strona „Dostępność" pokazywałaby 0 passes
      await window.axe.run(document, {
        runOnly: { type: "tag", values: tags },
      }),
    TAGS,
  );
};

const main = async () => {
  const browser = await chromium.launch();
  // reducedMotion: audytujemy stan docelowy. Karty wjeżdżają przez 600 ms
  // ( Biblioteka: 115 fiszek z kaskadą opóźnień do 1,2 s), a axe liczy
  // kontrast z opacity - pomiar w locie dawał fałszywe naruszenia.
  // Stan „bez ruchu" jest częścią gwarancji WCAG 2.3.3, więc to, co
  // audytujemy, nie jest wygodnym uproszczeniem, tylko jednym z dwóch
  // równoważnych stanów interfejsu.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  const pages = [];
  const violations = [];

  for (const v of VIEWS) {
    const res = await run(page, v.route);
    const n = res.violations.reduce((s, x) => s + x.nodes.length, 0);
    pages.push({
      route: v.route,
      label: v.label,
      violations: n,
      passes: res.passes?.length ?? 0,
    });
    for (const x of res.violations) {
      violations.push({
        id: x.id,
        impact: x.impact ?? "n/d",
        help: x.help,
        nodes: x.nodes.length,
        route: v.route,
        // pierwszy selektor wystarcza do namierzenia miejsca w kodzie
        where: x.nodes[0]?.target?.join(" ") ?? "",
      });
    }
    console.log(
      `${n === 0 ? "OK  " : "BŁĄD"} ${v.label.padEnd(30)} naruszeń: ${n}`,
    );
    if (n > 0) {
      for (const x of res.violations) {
        console.log(`       ${x.id} (${x.impact}, ${x.nodes.length}×): ${x.help}`);
        console.log(`         → ${x.nodes[0]?.target?.join(" ")}`);
      }
    }
  }

  await browser.close();

  const total = pages.reduce((s, p) => s + p.violations, 0);
  const out = {
    generatedAt: new Date().toISOString(),
    tool: "axe-core " + (JSON.parse(
      readFileSync(require.resolve("axe-core/package.json"), "utf8"),
    ).version),
    standard: "WCAG 2.1 AA",
    pages,
    violations,
  };
  const dest = join(ROOT, "src", "data", "audit.json");
  writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");

  console.log(`\nRAZEM naruszeń: ${total}`);
  console.log(`Zapisano: ${dest}`);
  if (total > 0) process.exitCode = 1;
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
