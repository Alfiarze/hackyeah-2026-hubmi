import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const scrollY = () => page.evaluate(() => window.scrollY);

// 1. start na matchmakingu, zjedź w dół
await page.goto(`${BASE}/#matchmaking`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(800);
await page.evaluate(() => window.scrollTo(0, 2500));
await page.waitForTimeout(200);
console.log('po scrollTo(2500):', await scrollY());

// 2. klik w zakładkę „Zasobnik wiedzy"
await page.locator('.hdr__nav a[href="#biblioteka"]').click();
await page.waitForTimeout(600);
console.log('po zmianie zakładki:', await scrollY());

// 3. klik w zakładkę bieżącą (ten sam widok)
await page.evaluate(() => window.scrollTo(0, 3000));
await page.waitForTimeout(150);
await page.locator('.hdr__nav a[href="#biblioteka"]').click();
await page.waitForTimeout(600);
console.log('po kliknięciu tej samej zakładki:', await scrollY());

// 4. link ze stopki (Middleman)
await page.evaluate(() => window.scrollTo(0, 2200));
await page.waitForTimeout(150);
await page.locator('.ftr__nav a[href="#middleman"]').click();
await page.waitForTimeout(600);
console.log('po linku ze stopki:', await scrollY());

// 5. wstecz w historii (back)
await page.goBack();
await page.waitForTimeout(600);
console.log('po goBack():', await scrollY(), '(hash:', await page.evaluate(() => location.hash), ')');

await browser.close();
