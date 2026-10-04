/**
 * Krok 2/3: obraz.
 *
 * Każda scena nagrywana osobno (własny kontekst Playwrighta = własny plik
 * webm). Przygotowanie sceny - nawigacja, przeklikanie rozmowy, dojazd do
 * właściwego miejsca strony - dzieje się za kurtyną wstrzykniętą jeszcze
 * przed renderem aplikacji, więc do kadru wchodzi tylko to, co ma być widać.
 *
 * Moment zdjęcia kurtyny to „zero” sceny; od niego liczone są offsety zdań
 * z `timings.json`, a nadmiar na początku pliku zapisujemy w `scenes.json`,
 * żeby montaż mógł go uciąć.
 *
 *   PITCH_WORK=… node scripts/pitch_video/record.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SCENES, SIZE, BASE, QUERY } from "./script.mjs";
import { WORK, dir } from "./lib.mjs";

const timings = JSON.parse(readFileSync(join(WORK, "timings.json"), "utf8"));
const byId = new Map(timings.scenes.map((s) => [s.id, s]));

/** Bez argumentów kręcimy całość; z argumentami dokrywamy wybrane sceny
 *  (np. po poprawce w aplikacji) i doklejamy je do istniejącego manifestu. */
const ONLY = process.argv.slice(2);
const RAW = dir("raw");
if (!ONLY.length) rmSync(RAW, { recursive: true, force: true });

// --------------------------------------------------------------- warstwa UI --

/** Kurtyna + napisy + wskaźnik myszy + style kart. Wstrzykiwane przed
 *  skryptami strony, żeby kurtyna zdążyła przykryć pierwszą klatkę. */
const INIT = `
(() => {
  const css = document.createElement("style");
  css.textContent = \`
    #pv-curtain { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
      background: #0f3a40; display: grid; place-items: center; transition: opacity .35s ease; }
    #pv-curtain span { font: 700 44px/1 "Bricolage Grotesque", system-ui, sans-serif;
      color: #eaf6f4; letter-spacing: -.02em; opacity: .85; }
    #pv-cap { position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%);
      z-index: 2147482000; pointer-events: none; max-width: 1120px; width: max-content;
      background: rgba(16,52,58,.94); color: #fff; border-radius: 14px;
      padding: 14px 26px; font: 500 25px/1.38 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      text-align: center; text-wrap: balance; opacity: 0; transition: opacity .25s ease;
      box-shadow: 0 10px 40px rgba(16,52,58,.25); }
    #pv-cap.on { opacity: 1; }
    #pv-cursor { position: fixed; z-index: 2147481000; width: 26px; height: 26px; left: 0; top: 0;
      margin: -13px 0 0 -13px; border-radius: 50%; pointer-events: none; opacity: 0;
      background: rgba(43,179,165,.35); border: 2px solid #16756c;
      transition: transform .42s cubic-bezier(.4,.1,.2,1), opacity .25s ease, scale .18s ease; }
    #pv-cursor.press { scale: .55; background: rgba(43,179,165,.8); }

    /* --- plansze --- */
    #pv-root { position: fixed; inset: 0; z-index: 2147480000; background: #fff;
      display: flex; flex-direction: column; justify-content: center; gap: 22px;
      padding: 0 110px; overflow: hidden;
      background-image: radial-gradient(900px 520px at 88% -10%, #eaf6f4 0%, rgba(234,246,244,0) 70%),
                        radial-gradient(760px 480px at -8% 108%, #f7f2ea 0%, rgba(247,242,234,0) 70%); }
    #pv-root .pv-rv { opacity: 0; transform: translateY(16px);
      transition: opacity .6s ease, transform .7s cubic-bezier(.2,.75,.2,1); }
    #pv-root .pv-rv.on { opacity: 1; transform: none; }
    #pv-root .pv-eyebrow { font: 700 17px/1 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      letter-spacing: .14em; text-transform: uppercase; color: #16756c; margin: 0; }
    #pv-root h1 { font: 800 120px/1 "Bricolage Grotesque", system-ui, sans-serif;
      color: #10343a; letter-spacing: -.03em; margin: 6px 0 0; }
    #pv-root h2 { font: 800 60px/1.06 "Bricolage Grotesque", system-ui, sans-serif;
      color: #10343a; letter-spacing: -.02em; margin: 2px 0 6px; max-width: 20ch; }
    #pv-root h3 { font: 800 27px/1.2 "Bricolage Grotesque", system-ui, sans-serif;
      color: #16756c; margin: 0 0 8px; }
    #pv-root .pv-sub { font: 400 30px/1.3 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      color: #4a6266; margin: 10px 0 0; }
    #pv-root .pv-lead { font: 700 38px/1.3 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      color: #10343a; margin: 8px 0 0; max-width: 26ch; }
    #pv-root .pv-lead.pv-end { font-size: 44px; max-width: none; }
    #pv-root .pv-wordmark { font: 800 66px/1 "Bricolage Grotesque", system-ui, sans-serif;
      color: #10343a; letter-spacing: -.03em; margin: 18px 0 0; }
    #pv-root .pv-note { font: 400 21px/1.5 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      color: #4a6266; margin: 4px 0 0; }
    #pv-root mark { background: linear-gradient(transparent 62%, #ffcc00 62%); color: inherit; }
    #pv-root .pv-kpis { display: flex; gap: 18px; margin-top: 10px; flex-wrap: wrap; }
    #pv-root .pv-kpi { background: #fff; border: 1px solid #d5e3e0; border-radius: 16px;
      padding: 16px 22px; min-width: 210px; }
    #pv-root .pv-kpis--wide .pv-kpi { min-width: 330px; }
    #pv-root .pv-kpi b { display: block; font: 800 42px/1.05 "Bricolage Grotesque", system-ui, sans-serif;
      color: #16756c; letter-spacing: -.02em; }
    #pv-root .pv-kpi span { display: block; margin-top: 6px; font: 700 15px/1.3 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      letter-spacing: .06em; text-transform: uppercase; color: #4a6266; }
    #pv-root .pv-split { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    #pv-root .pv-quote { background: #eaf6f4; border: 1px solid #cfe4e0; border-left: 6px solid #2bb3a5;
      border-radius: 0 16px 16px 0; padding: 20px 26px; }
    #pv-root .pv-quote--cold { background: #f4f6f6; border-color: #dfe5e5; border-left-color: #9ab5b0; }
    #pv-root .pv-quote p { margin: 8px 0 0; font: 700 29px/1.35 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      color: #10343a; }
    #pv-root .pv-tag { font: 700 14px/1 "Atkinson Hyperlegible Next", system-ui, sans-serif;
      letter-spacing: .14em; text-transform: uppercase; color: #4a6266; }
    #pv-root .pv-zero { font: 800 40px/1 "Bricolage Grotesque", system-ui, sans-serif;
      color: #b8001a; margin: 2px 0 0; }
    #pv-root .pv-box { background: #fff; border: 1px solid #d5e3e0; border-radius: 18px; padding: 24px 26px; }
    #pv-root .pv-arch { display: flex; align-items: stretch; gap: 10px; margin-top: 22px;
      border: 2px dashed #0f766e; border-radius: 18px; padding: 18px 20px; background: #f2f9f7; }
    #pv-root .pv-arch-box { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px;
      background: #fff; border: 1px solid #d5e3e0; border-radius: 14px; padding: 14px 16px;
      font: 700 19px/1.25 "Atkinson Hyperlegible Next", system-ui, sans-serif; color: #10343a; text-align: center; }
    #pv-root .pv-arch-box--ai { border: 2px solid #0f766e; }
    #pv-root .pv-arch-box small { font: 400 15px/1.3 "Atkinson Hyperlegible Next", system-ui, sans-serif; color: #3f6b6b; }
    #pv-root .pv-arch-arrow { align-self: center; color: #0f766e; font-size: 24px; font-weight: 700; }
    #pv-root .pv-box p { margin: 0; font: 400 22px/1.5 "Atkinson Hyperlegible Next", system-ui, sans-serif; color: #10343a; }
  \`;

  const mount = () => {
    if (!document.body) return;
    document.documentElement.appendChild(css);
    const c = document.createElement("div");
    c.id = "pv-curtain";
    c.innerHTML = "<span>HubMI</span>";
    const cap = document.createElement("div");
    cap.id = "pv-cap";
    const cur = document.createElement("div");
    cur.id = "pv-cursor";
    document.body.append(c, cap, cur);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });

  window.__pv = {
    open() {
      const c = document.getElementById("pv-curtain");
      if (c) { c.style.opacity = "0"; setTimeout(() => c.remove(), 420); }
    },
    cap(text) {
      const el = document.getElementById("pv-cap");
      if (!el) return;
      if (!text) { el.classList.remove("on"); return; }
      const set = () => { el.textContent = text; el.classList.add("on"); };
      if (el.classList.contains("on")) { el.classList.remove("on"); setTimeout(set, 160); }
      else set();
    },
    cursor(x, y) {
      const el = document.getElementById("pv-cursor");
      if (!el) return;
      el.style.opacity = "1";
      el.style.transform = \`translate(\${x}px, \${y}px)\`;
    },
    press() {
      const el = document.getElementById("pv-cursor");
      if (!el) return;
      el.classList.add("press");
      setTimeout(() => el.classList.remove("press"), 220);
    },
    card(html) {
      const r = document.createElement("div");
      r.id = "pv-root";
      r.innerHTML = html;
      document.body.appendChild(r);
    },
    step(n) {
      document.querySelectorAll("#pv-root .pv-rv").forEach((el) => {
        if (Number(el.dataset.at) <= n) el.classList.add("on");
      });
    },
    /** Płynne przewinięcie okna - wheel skacze, a w kadrze skok wygląda na błąd. */
    glide(by, ms) {
      return new Promise((done) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          window.scrollTo(0, from + by * e);
          if (k < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
    },
  };
})();
`;

// ------------------------------------------------------------------ pomoce --

const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/** Klik z widocznym wskaźnikiem: najazd, przyciśnięcie, dopiero potem klik. */
async function click(p, locator, { settle = 420 } = {}) {
  const box = await locator.boundingBox();
  if (box) {
    await p.evaluate(
      ([x, y]) => window.__pv.cursor(x, y),
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    await sleep(settle);
    await p.evaluate(() => window.__pv.press());
    await sleep(120);
  }
  await locator.click();
}

const glide = (p, by, ms) => p.evaluate(([b, m]) => window.__pv.glide(b, m), [by, ms]);

/** Dojazd rozmowy do wyników - używany w scenach, które zaczynają się „po”. */
async function toResults(p) {
  await p.getByRole("textbox").first().fill(QUERY);
  await p.getByRole("button", { name: "Szukaj" }).click();
  for (let i = 0; i < 3; i++) {
    await p.waitForTimeout(500);
    const chips = p.locator('[aria-label="Szybkie odpowiedzi"] button');
    if (!(await chips.count())) break;
    const woj = chips.filter({ hasText: "krakowski" });
    await ((await woj.count()) ? woj.first() : chips.first()).click();
  }
  await p.locator(".mm__summary").first().waitFor({ timeout: 40000 });
  await p.waitForTimeout(1200);
}

/** Pierwsza karta wyniku - kotwica dla scen „dlaczego” i „mapa”. */
const firstCard = (p) => p.locator("article.fiszka").first();

// ------------------------------------------------------------------- sceny --

const ACTS = {
  "03-matchmaking": {
    async prepare(p) {
      await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
      await p.waitForTimeout(900);
    },
    async act(p, at) {
      const input = p.getByRole("textbox").first();
      await at(0);
      await sleep(1100);
      await click(p, input, { settle: 320 });
      await input.pressSequentially(QUERY, { delay: 52 });

      await at(1);
      await click(p, p.getByRole("button", { name: "Szukaj" }));
      await p.waitForTimeout(900);
      const chips = p.locator('[aria-label="Szybkie odpowiedzi"] button');
      if (await chips.count()) {
        const woj = chips.filter({ hasText: "krakowski" });
        await click(p, (await woj.count()) ? woj.first() : chips.first());
      }

      await at(2);
      await p.locator(".mm__summary").first().waitFor({ timeout: 40000 });
      await p.waitForTimeout(900);
      await p.locator("section.results").first().scrollIntoViewIfNeeded();
      await sleep(900);
      // Krótki dojazd: scena III kończy się na nagłówku fiszki z oceną,
      // rozbiór „dlaczego to pasuje” należy do sceny IV.
      await glide(p, 240, 4200);
    },
  },

  "04-dlaczego": {
    async prepare(p) {
      await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
      await p.waitForTimeout(600);
      await toResults(p);
      await firstCard(p).scrollIntoViewIfNeeded();
      await p.evaluate(() => window.scrollBy(0, -60));
      await p.waitForTimeout(400);
    },
    async act(p, at) {
      await at(0);
      await sleep(1400);
      await glide(p, 260, 2600);
      await at(1);
      await glide(p, 420, 5200);
      await at(2);
      await glide(p, 520, 6000);
    },
  },

  "05-mapa": {
    async prepare(p) {
      await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
      await p.waitForTimeout(600);
      await toResults(p);
      const map = p.locator("figure.map").first();
      await map.scrollIntoViewIfNeeded();
      await p.evaluate(() => window.scrollBy(0, -140));
      await p.waitForTimeout(500);
    },
    async act(p, at) {
      await at(0);
      await sleep(1600);
      await glide(p, 300, 4800);
    },
  },

  "06-middleman": {
    async prepare(p) {
      await p.goto(`${BASE}/#middleman`, { waitUntil: "networkidle" });
      await p.waitForTimeout(700);
      await p.locator(".ts__option").first().click({ timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(2200);
    },
    async act(p, at) {
      await at(0);
      await sleep(1500);
      await glide(p, 320, 3600);
      await at(1);
      await glide(p, 700, 7000);
    },
  },

  "07-admin": {
    async prepare(p) {
      await p.goto(`${BASE}/#admin`, { waitUntil: "networkidle" });
      await p.waitForTimeout(700);
      await p.getByRole("tab", { name: /potrzeby i trendy/i }).click();
      await p.waitForTimeout(1200);
    },
    async act(p, at) {
      await at(0);
      await sleep(1400);
      await glide(p, 260, 3000);
      await at(1);
      await glide(p, 520, 6500);
      await at(2);
      await glide(p, 480, 5200);
    },
  },

  "08-dostepnosc": {
    async prepare(p) {
      await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
      await p.waitForTimeout(900);
    },
    async act(p, at) {
      await at(0);
      await sleep(1200);
      await click(p, p.getByRole("button", { name: /Wysoki kontrast/i }).first());
      await sleep(2600);
      await click(p, p.getByRole("button", { name: /bardzo duża/i }).first());
      await sleep(1800);
      await at(1);
      // Fokus klawiaturą - ramka focusu to część dowodu dostępności.
      for (let i = 0; i < 4; i++) { await p.keyboard.press("Tab"); await sleep(520); }
    },
  },
};

/** Plansze: wspólna obsługa - wstrzyknięcie kartonu i odsłanianie warstwami. */
function cardAct(scene) {
  return {
    async prepare(p) {
      await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
      await p.evaluate((html) => window.__pv.card(html), scene.card);
      await p.waitForTimeout(250);
    },
    async act(p, at) {
      for (let i = 0; i < scene.lines.length; i++) {
        await at(i);
        await p.evaluate((n) => window.__pv.step(n), i);
      }
    },
  };
}

// ----------------------------------------------------------------- nagranie --

const browser = await chromium.launch();
const manifestPath = join(WORK, "scenes.json");
const manifest =
  ONLY.length && existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")).filter((m) => !ONLY.some((o) => m.id.includes(o)))
    : [];

for (const scene of SCENES) {
  if (ONLY.length && !ONLY.some((o) => scene.id.includes(o))) continue;
  const t = byId.get(scene.id);
  if (!t) throw new Error(`Brak czasów dla sceny ${scene.id} - uruchom tts.mjs`);

  // Dokrywka: skasuj poprzednie ujęcie tej sceny, żeby w katalogu nie został
  // osierocony webm z wcześniejszego podejścia.
  if (ONLY.length) rmSync(join(RAW, scene.id), { recursive: true, force: true });

  const ctx = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: join(RAW, scene.id), size: SIZE },
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  });
  await ctx.addInitScript(INIT);
  const t0 = Date.now();
  const page = await ctx.newPage();

  const acts = scene.kind === "card" ? cardAct(scene) : ACTS[scene.id];
  await acts.prepare(page);

  // Zero sceny: kurtyna w dół, pierwszy napis w górę.
  const start = Date.now();
  await page.evaluate(() => window.__pv.open());

  const at = async (i) => {
    const target = start + t.offsets[i] * 1000;
    await sleep(target - Date.now());
    if (scene.kind !== "card") {
      await page.evaluate((txt) => window.__pv.cap(txt), t.lines[i].text);
    }
  };

  try {
    await acts.act(page, at);
  } catch (e) {
    console.warn(`  ! ${scene.id}: ${String(e.message).split("\n")[0]}`);
  }

  // Dociągnięcie do pełnej długości sceny - montaż tnie co do milisekundy.
  await sleep(start + t.dur * 1000 - Date.now());
  if (scene.kind !== "card") await page.evaluate(() => window.__pv.cap(null)).catch(() => {});
  await sleep(220);

  const video = page.video();
  await ctx.close();
  const file = await video.path();

  manifest.push({ id: scene.id, file, trim: (start - t0) / 1000, dur: t.dur });
  console.log(`✓ ${scene.id.padEnd(16)} trim ${((start - t0) / 1000).toFixed(2)}s  dur ${t.dur.toFixed(2)}s`);
}

await browser.close();
const order = new Map(SCENES.map((s, i) => [s.id, i]));
manifest.sort((a, b) => order.get(a.id) - order.get(b.id));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nSurowe sceny: ${RAW}`);
