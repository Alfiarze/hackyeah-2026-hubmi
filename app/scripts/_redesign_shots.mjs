import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:5173';
const ROUTES = ['matchmaking', 'biblioteka', 'kreator', 'tester', 'komunikacja', 'admin', 'middleman', 'dostepnosc'];

fs.mkdirSync('../design-system/shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

for (const r of ROUTES) {
  await page.goto(`${BASE}/#${r}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `../design-system/shots/${r}.png`, fullPage: false });
  console.log('shot', r);
}
await browser.close();
