import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core");
const URL = "http://localhost:4321/";

const browser = await chromium.launch();

const WIDTHS = [390, 768, 1280, 1440];
const MODES = [
  { name: "domyślny", setup: null },
  { name: "jasny", setup: "#toggle-theme" },
  { name: "wysoki kontrast", setup: "#toggle-contrast" },
  { name: "czcionka 1.5", setup: '[data-scale="1.5"]' },
];

let fails = 0;

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`${w}px - przewijanie w poziomie: ${over}px ${over > 0 ? "FAIL" : "ok"}`);
  if (over > 0) fails++;
  await ctx.close();
}

for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  if (mode.setup) await page.click(mode.setup);
  await page.waitForTimeout(400);
  // Treść musi być w pełni widoczna dla axe. Zdejmujemy klasę `js-reveal`
  // zamiast dopisywać `reveal--in`: inaczej axe mierzy kontrast w trakcie
  // 620 ms przejścia krycia i zwraca losowe wyniki.
  await page.evaluate(() => document.documentElement.classList.remove("js-reveal"));
  await page.waitForTimeout(300);
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () =>
    // @ts-ignore
    await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    }),
  );
  const v = res.violations;
  console.log(`axe [${mode.name}]: ${v.length} naruszeń`);
  v.forEach((x) =>
    console.log(`   · ${x.id} (${x.impact}) ×${x.nodes.length} - ${x.nodes[0].target.join(" ")}`),
  );
  fails += v.length;
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
