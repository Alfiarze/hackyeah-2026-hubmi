import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:4173/#admin", { waitUntil: "networkidle" });
await p.getByRole("tab", { name: /potrzeby i trendy/ }).click();
await p.waitForTimeout(500);
const out = await p.evaluate(() => {
  const a = document.getElementById("atab-skrzynka");
  const res = [];
  const collect = (rules, media) => { for (const r of rules) {
    if (r.media) { collect(r.cssRules, r.conditionText); continue; }
    if (r.style && r.selectorText) { let m = false; try { m = a.matches(r.selectorText); } catch {} if (m) res.push({ media: media ?? "", sel: r.selectorText, bg: r.style.background || r.style.backgroundColor, color: r.style.color }); }
  } };
  for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch {} }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
