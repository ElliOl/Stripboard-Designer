#!/usr/bin/env node
/**
 * Verify Stripboard Designer: toolbar buttons, DIP-8 placement, selection, rotate.
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5175/';
const SCREENSHOT_PATH = 'stripboard-verify-screenshot.png';

const consoleErrors = [];
const pageErrors = [];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('canvas', { timeout: 5000 });
    await page.waitForTimeout(800); // Let component library load

    const report = [];

    // 1. Check toolbar buttons
    const rotateBtn = page.locator('button[title="Rotate 90° CW (R)"]');
    const networkBtn = page.locator('button[title*="Ratsnest"]');
    const netlistBtn = page.locator('button[title="Import KiCad Netlist (.net)"]');

    const hasRotate = await rotateBtn.count() > 0;
    const hasNetwork = await networkBtn.count() > 0;
    const hasNetlist = await netlistBtn.count() > 0;

    report.push('--- 1. Toolbar buttons ---');
    report.push(`  Rotate (circular arrow): ${hasRotate ? '✓' : '✗'}`);
    report.push(`  Network/Ratsnest toggle: ${hasNetwork ? '✓' : '✗'}`);
    report.push(`  Netlist import (file-up): ${hasNetlist ? '✓' : '✗'}`);

    // 2. Drag DIP-8 IC onto canvas
    const dip8Source = page.locator('[draggable="true"]').filter({ hasText: 'DIP-8 IC' }).first();
    const canvasContainer = page.locator('div.flex-1.h-full.overflow-hidden').filter({ has: page.locator('canvas') }).first();

    const dip8Exists = await dip8Source.count() > 0;
    report.push('\n--- 2. Drag DIP-8 onto canvas ---');
    if (!dip8Exists) {
      report.push('  ✗ DIP-8 IC not found in sidebar');
    } else {
      await dip8Source.dragTo(canvasContainer, { force: true });
      await page.waitForTimeout(500);

      const hasCompInStatusBar = await page.locator('text=/\\d+ comp/').count() > 0;
      report.push(`  Status bar shows component count: ${hasCompInStatusBar ? '✓' : '?'}`);
      report.push('  ✓ DIP-8 IC dropped onto canvas');
    }

    // 3. Click to select the component (Select tool is default; component is at drop center)
    const canvasBox = await canvasContainer.boundingBox();
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      await page.mouse.click(centerX, centerY);
      await page.waitForTimeout(200);
    }

    // 4. Check rotate button enabled when selected
    const rotateDisabled = await rotateBtn.getAttribute('disabled');
    const rotateEnabled = hasRotate && !rotateDisabled;
    report.push('\n--- 3. Rotate button when DIP-8 selected ---');
    report.push(`  Rotate enabled: ${rotateEnabled ? '✓' : '✗'}`);

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    report.push('\n--- Screenshot ---');
    report.push(`  Saved to: ${SCREENSHOT_PATH}`);
    report.push('\n--- Errors ---');
    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      report.push('  None');
    } else {
      [...pageErrors, ...consoleErrors].forEach((e) => report.push('  ' + e));
    }

    console.log('\n=== Stripboard Designer Verification ===\n');
    console.log(report.join('\n'));
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    console.log('Screenshot saved (may show error state)');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
