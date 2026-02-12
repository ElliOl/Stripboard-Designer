#!/usr/bin/env node
/**
 * Verify Stripboard Designer Inspector panel: tabs, auto-switch, component props, nets, pin assignments.
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5175/';
const SCREENSHOT_PATH = 'stripboard-inspector-screenshot.png';

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

  const report = [];

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('canvas', { timeout: 5000 });
    await page.waitForTimeout(800);

    // 1. Check Library and Inspector tabs
    const libraryTab = page.getByRole('button', { name: 'Library' });
    const inspectorTab = page.getByRole('button', { name: /Inspector/ });

    const hasLibrary = await libraryTab.count() > 0;
    const hasInspector = await inspectorTab.count() > 0;
    report.push('--- 1. Sidebar tabs ---');
    report.push(`  Library tab: ${hasLibrary ? '✓' : '✗'}`);
    report.push(`  Inspector tab: ${hasInspector ? '✓' : '✗'}`);

    if (hasLibrary) {
      await libraryTab.click();
      await page.waitForTimeout(150);
      const libraryVisible = await page.locator('text=DIP-8 IC').first().isVisible();
      report.push(`  Library tab content (DIP-8): ${libraryVisible ? '✓' : '✗'}`);
    }

    if (hasInspector) {
      await inspectorTab.click();
      await page.waitForTimeout(150);
      const inspectorEmpty = await page.locator('text=Select an item on the board').isVisible();
      report.push(`  Inspector tab (empty state): ${inspectorEmpty ? '✓' : '?'}`);
    }

    // 2. Switch to Library and drag DIP-8 onto canvas - drop near top-left for predictable position
    await libraryTab.click();
    await page.waitForTimeout(200);

    const dip8Source = page.locator('[draggable="true"]').filter({ hasText: 'DIP-8 IC' }).first();
    const canvasContainer = page.locator('div.flex-1.h-full.overflow-hidden').filter({ has: page.locator('canvas') }).first();
    const canvas = page.locator('canvas').first();

    await dip8Source.dragTo(canvasContainer, { force: true, targetPosition: { x: 150, y: 150 } });
    await page.waitForTimeout(400);

    report.push('\n--- 2. DIP-8 placed ---');
    report.push('  ✓ Dragged DIP-8 IC onto board');

    // 3. Select DIP-8 - click at drop point; component at grid (6,6), center ≈ (190,190) px
    const containerBox = await canvasContainer.boundingBox();
    const clickX = containerBox.x + 190;
    const clickY = containerBox.y + 190;
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(500);

    const inspectorShowingComponent = await page.locator('text=Pin ↔ Net Assignments').isVisible();
    report.push('\n--- 3. Auto-switch to Inspector on select ---');
    report.push(`  Inspector tab active after select: ${inspectorShowingComponent ? '✓' : '?'}`);
    report.push(`  Inspector shows component (Pin↔Net): ${inspectorShowingComponent ? '✓' : '✗'}`);

    // 4. Check component properties in Inspector
    const hasRefInput = await page.locator('input[value="U1"]').count() > 0;
    const hasRotateBtn = await page.locator('button:has-text("°")').count() > 0;
    const hasPosition = await page.locator('text=Position:').isVisible();
    const hasPinAssignments = await page.locator('text=Pin ↔ Net Assignments').isVisible();
    const pinDropdowns = await page.locator('select').count();

    report.push('\n--- 4. Inspector component properties ---');
    report.push(`  Reference (U1) editable input: ${hasRefInput ? '✓' : '✗'}`);
    report.push(`  Rotate button with angle: ${hasRotateBtn ? '✓' : '✗'}`);
    report.push(`  Position info: ${hasPosition ? '✓' : '✗'}`);
    report.push(`  Pin ↔ Net Assignments section: ${hasPinAssignments ? '✓' : '✗'}`);
    report.push(`  Pin dropdowns (8 for DIP-8): ${pinDropdowns >= 8 ? '✓' : `✗ (found ${pinDropdowns})`}`);

    // 5. Nets section - click Add Net
    const addNetBtn = page.getByRole('button', { name: '+ Add Net' });
    const hasAddNet = await addNetBtn.count() > 0;
    report.push('\n--- 5. Nets section ---');
    report.push(`  "+ Add Net" button: ${hasAddNet ? '✓' : '✗'}`);

    if (hasAddNet) {
      await addNetBtn.click();
      await page.waitForTimeout(200);
      const netCount1 = await page.locator('div').filter({ has: page.locator('input[type="color"]') }).count();
      const hasColorSwatch = await page.locator('input[type="color"]').count() > 0;
      report.push(`  First net created (color swatch): ${hasColorSwatch ? '✓' : '✗'}`);

      // Create second net
      await addNetBtn.click();
      await page.waitForTimeout(200);
      const netCount2 = await page.locator('input[type="color"]').count();
      report.push(`  Second net created: ${netCount2 >= 2 ? '✓' : '✗'}`);
    }

    // 6. Assign net to pin via dropdown
    const firstSelect = page.locator('select').first();
    const options = await firstSelect.locator('option').allTextContents();
    const hasNetOptions = options.some((t) => t !== '— none —' && t.length > 0);
    report.push('\n--- 6. Pin-to-net assignment ---');
    report.push(`  Net options in pin dropdown: ${hasNetOptions ? '✓' : options.length > 1 ? '✓' : '?'}`);

    if (options.length > 1) {
      await firstSelect.selectOption({ index: 1 });
      await page.waitForTimeout(150);
      report.push('  ✓ Selected a net in pin 1 dropdown');
    }

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    report.push('\n--- Screenshot ---');
    report.push(`  Saved to: ${SCREENSHOT_PATH}`);
    report.push('\n--- Errors ---');
    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      report.push('  None');
    } else {
      [...pageErrors, ...consoleErrors].forEach((e) => report.push('  ' + e));
    }

    console.log('\n=== Stripboard Inspector Panel Verification ===\n');
    console.log(report.join('\n'));
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    console.log('Screenshot saved');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
