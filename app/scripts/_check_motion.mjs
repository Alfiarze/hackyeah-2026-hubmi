/** Kontrola: reveal na każdej podstronie + żywe tło. Tymczasowy skrypt. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "..", "docs", "screenshots", "_motion");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.AUDIT_URL ?? "http://localhost:4173";

const ROUTES = [
  "matchmaking", "biblioteka", "kreator", "tester",
  "komunikacja", "admin", "middleman", "dostepnosc",
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const problems = [];

for (const r of ROUTES) {
  await p.goto(`${BASE}/#${r}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);

  // przewijamy stronę krok po kroku, tak jak użytkownik
  await p.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    const end = document.documentElement.scrollHeight;
    for (let y = 0; y <= end; y += step) {
      window.scrollTo(0, y);
      await new Promise((res) => setTimeout(res, 130));
    }
    window.scrollTo(0, end);
    await new Promise((res) => setTimeout(res, 700));
  });
  await p.waitForTimeout(700);

  const info = await p.evaluate(() => {
    const bd = document.querySelector(".backdrop");
    const all = [...document.querySelectorAll("[data-reveal]")];
    const stuck = all.filter(
      (el) => el.classList.contains("reveal--in") === false,
    );
    const mote = document.querySelector(".backdrop__mote");
    return {
      total: all.length,
      revealed: all.length - stuck.length,
      stuck: stuck.map((el) => el.className).slice(0, 6),
      route: bd?.getAttribute("data-route"),
      live: bd?.classList.contains("backdrop--live") ?? false,
      motes: document.querySelectorAll(".backdrop__mote").length,
      moteAnimations: mote ? mote.getAnimations().length : -1,
      sy: bd ? getComputedStyle(bd).getPropertyValue("--sy").trim() : "?",
      film: Boolean(document.querySelector(".backdrop__video")),
    };
  });

  const line = `${r.padEnd(13)} reveal ${info.revealed}/${info.total} · route=${info.route} live=${info.live} motes=${info.motes} anim=${info.moteAnimations} sy=${info.sy} film=${info.film}`;
  console.log(line);
  if (info.revealed < info.total) {
    problems.push(`${r}: nie odsłonięte -> ${info.stuck.join(" | ")}`);
  }
  if (info.route !== r) problems.push(`${r}: backdrop data-route=${info.route}`);
  if (info.motes !== 12) problems.push(`${r}: iskry=${info.motes}`);
  if (info.moteAnimations < 1) problems.push(`${r}: iskry bez animacji`);
  if (!info.live) problems.push(`${r}: brak backdrop--live`);

  await p.screenshot({ path: join(OUT, `${r}-dol.png`) });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(500);
  await p.screenshot({ path: join(OUT, `${r}-gora.png`) });
}

// materiał filmowy: czy faktycznie się odtwarza
await p.goto(`${BASE}/#matchmaking`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const film = await p.evaluate(() => {
  const v = document.querySelector(".backdrop__video");
  return v ? { t: v.currentTime, paused: v.paused, w: v.videoWidth } : null;
});
console.log("film:", JSON.stringify(film));
if (!film || film.paused || film.t <= 0) problems.push(`film nie gra: ${JSON.stringify(film)}`);

// pauza z paska dostępności: ruch ma dać się zatrzymać
await p.getByRole("button", { name: "Ruch w tle" }).click();
await p.waitForTimeout(600);
const paused = await p.evaluate(() => ({
  live: document.querySelector(".backdrop").classList.contains("backdrop--live"),
  motesHidden:
    getComputedStyle(document.querySelector(".backdrop__motes")).display === "none",
  videoPaused: document.querySelector(".backdrop__video")?.paused ?? true,
}));
console.log("po pauzie:", JSON.stringify(paused));
if (paused.live || !paused.motesHidden || !paused.videoPaused) {
  problems.push(`pauza nie działa: ${JSON.stringify(paused)}`);
}

await b.close();

if (problems.length) {
  console.log("\nPROBLEMY:");
  for (const x of problems) console.log(" - " + x);
  process.exit(1);
}
console.log("\nOK — reveal i tło działają na wszystkich podstronach.");
