#!/usr/bin/env node
/**
 * Quick script to verify Stripboard Designer app loads and capture screenshot.
 * Run: node check-app.mjs
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5175/';
const SCREENSHOT_PATH = 'stripboard-check-screenshot.png';

const consoleLogs = [];
const consoleErrors = [];
const pageErrors = [];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      consoleErrors.push(text);
    } else {
      consoleLogs.push({ type, text });
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 10000 });
    if (!response || !response.ok()) {
      console.error('Page failed to load:', response?.status(), response?.statusText());
      await browser.close();
      process.exit(1);
    }

    // Wait for React to hydrate and Konva canvas to appear
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    // Check for expected elements (use narrow selectors to avoid strict mode)
    const safe = (fn) => fn().catch(() => false);
    const checks = {
      toolbar: (await page.locator('div.h-11').count()) > 0,
      toolButtons: (await page.locator('button:has(svg)').count()) >= 5,
      canvas: (await page.locator('canvas').count()) > 0,
      componentLibrary: await safe(() => page.getByRole('heading', { name: 'Components' }).isVisible()),
      statusBar: (await page.locator('div.bg-\\[\\#1e1e1e\\].border-t').count()) > 0,
      categoryIC: await safe(() => page.getByText('IC', { exact: true }).first().isVisible()),
      categoryPassive: await safe(() => page.getByText('Passive', { exact: true }).first().isVisible()),
      categoryConnector: await safe(() => page.getByText('Connector', { exact: true }).first().isVisible()),
      categoryDiscrete: await safe(() => page.getByText('Discrete', { exact: true }).first().isVisible()),
      zoomDisplay: (await page.locator('button:has-text("%")').count()) > 0,
      exportButton: (await page.locator('button[title="Export Project"]').count()) > 0,
      importButton: (await page.locator('button[title="Import Project"]').count()) > 0,
    };

    console.log('\n=== Stripboard Designer App Check ===\n');
    console.log('URL:', URL);
    console.log('Screenshot saved to:', SCREENSHOT_PATH);
    console.log('\n--- Element checks ---');
    for (const [name, ok] of Object.entries(checks)) {
      console.log(`  ${name}: ${ok ? '✓' : '✗'}`);
    }
    console.log('\n--- Console errors ---');
    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      console.log('  None');
    } else {
      [...pageErrors, ...consoleErrors].forEach((e) => console.log('  ', e));
    }
    console.log('\n--- Visible error overlays ---');
    const overlay = await page.locator('[class*="error"], [role="alert"], .error-overlay').count();
    console.log('  Error overlay elements:', overlay);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
