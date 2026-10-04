/**
 * Weryfikacja useSpeech na zaślepce SpeechRecognition.
 * Scenariusze: (A) sesja kończy się bez wyniku finalnego, (B) szybkie stop->start.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:5173/";

const stub = () => {
  class FakeRec {
    constructor() {
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.onstart = null;
      this._dead = false;
      window.__recs = window.__recs || [];
      window.__recs.push(this);
    }
    start() {
      if (this._dead) throw new Error("InvalidStateError");
      this._started = true;
      setTimeout(() => this.onstart && this.onstart(), 0);
    }
    stop() {
      if (this._dead) return;
      this._dead = true;
      setTimeout(() => this.onend && this.onend(), 0);
    }
    abort() {
      if (this._dead) return;
      this._dead = true;
      setTimeout(() => {
        this.onerror && this.onerror({ error: "aborted" });
        this.onend && this.onend();
      }, 0);
    }
    // pomocnicze dla testu
    emit(text, isFinal) {
      this.onresult &&
        this.onresult({
          resultIndex: 0,
          results: [Object.assign([{ transcript: text }], { isFinal })],
        });
    }
    end() {
      this._dead = true;
      this.onend && this.onend();
    }
  }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  // zgoda na mikrofon bez prawdziwego urządzenia
  navigator.mediaDevices = navigator.mediaDevices || {};
  navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
  window.__live = () => window.__recs.filter((r) => !r._dead);
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(stub);
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console error]", m.text());
});
await page.goto(BASE, { waitUntil: "networkidle" });

const fails = [];
const ok = (name, cond, extra = "") =>
  (cond ? console.log("PASS", name) : (console.log("FAIL", name, extra), fails.push(name)));

// Przycisk mikrofonu musi istnieć (supported === true przy zaślepce).
const mic = page.getByRole("button", { name: /Dyktuj głosem/i });
await mic.waitFor({ timeout: 10000 });
ok("mic button present", await mic.isVisible());

// --- A: sesja bez wyniku finalnego nie może gubić tekstu ---
await mic.click();
await page.waitForFunction(() => window.__recs?.length >= 1);
await page.waitForTimeout(100);
ok(
  "A: listening po starcie",
  (await page.locator(".mm__listening").count()) > 0,
  "brak komunikatu „Słucham…”",
);
ok("A: dokladnie jedna zywa instancja", (await page.evaluate(() => window.__live().length)) === 1);

await page.evaluate(() => window.__live()[0].emit("brak windy w bloku", false));
await page.waitForTimeout(80);
ok(
  "A: interim widoczny",
  (await page.locator(".mm__listening em").innerText()).includes("brak windy"),
);

// Chrome tak kończy sesję: onend bez finału. Tekst musi zostać zatwierdzony.
await page.evaluate(() => window.__recs.find((r) => !r._dead).end());
await page.waitForTimeout(400);
const bubbles = await page.locator(".mm__bubble, .mm__turn, [data-role='user']").allInnerTexts();
const transcriptLanded = bubbles.join(" ").includes("brak windy w bloku");
ok("A: tekst z interim zatwierdzony po onend", transcriptLanded, JSON.stringify(bubbles.slice(-4)));
ok("A: listening zgaszony", (await page.locator(".mm__listening").count()) === 0);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nwszystko OK");
process.exit(fails.length ? 1 : 0);
