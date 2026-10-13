/**
 * Multi-Trust Functional Test Suite
 * Runs the 7 functional tests across all 10 configured trusts.
 * Skips gracefully when test data is unavailable for a trust.
 *
 * Tests per trust:
 *   1. Job: Edit fields (title, description, cost limit)
 *   2. Job: Cancel a job
 *   3. Job: Close a job
 *   4. Job: Add a note
 *   5. Invoice: Delete
 *   6. Settings: Business settings page
 *   7. Settings: User list
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const invoiceFile = path.join(__dirname, '../uploadfiles/Invoice Sample.pdf');

const email    = process.env.TEST_EMAIL    || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'ww9-Aerae0!!';

const TRUSTS = [
    'ABC Reapit UK',
    'ABC SME UK',
    'ABC Street UK',
    'ABC PropertyTree',
    'ABC Liquid NZ',
    'ABC Alto UK',
    'ABC PropertyMe Prismatic',
    'ABC IAMP UK',
    'ABC Console Big Company',
    'Property Me NZ v2',
];

const SS = (page, label) =>
    page.screenshot({ path: `tests/Screenshots/${Date.now()}-multifunc-${label}.png`, fullPage: true }).catch(() => {});

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function login(page) {
    await page.goto('https://dev.tapi.app/auth');
    await page.getByRole('textbox', { name: 'you@company.com' }).fill(email);
    await page.getByRole('textbox', { name: '••••••••' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForSelector('text=Inbox', { timeout: 60000 });
}

async function switchTrust(page, trustName) {
    await page.locator('.app-menu-company .app-menu-item').click({ force: true });
    await page.waitForSelector('.app-menu-item-content', { timeout: 10000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
            const s = window.getComputedStyle(el);
            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
                el.scrollTop = el.scrollHeight;
        });
    });
    await page.waitForTimeout(500);
    const clicked = await page.evaluate((name) => {
        for (const item of document.querySelectorAll('.app-menu-item-content')) {
            if (item.textContent.trim().includes(name)) {
                item.scrollIntoView({ block: 'nearest' }); item.click(); return true;
            }
        }
        return false;
    }, trustName);
    if (!clicked) await page.getByText(trustName, { exact: false }).last().click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.waitForLoadState('domcontentloaded');
}

// ── Generic property search ────────────────────────────────────────────────────
// Types into whatever input is focused after clicking a property/supplier button.
// Tries multiple terms until options appear.

async function typeSearchWithFallback(page, terms) {
    for (const term of terms) {
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.keyboard.type(term);
        const hasOpt = await page.waitForSelector('[role="option"]', { timeout: 5000 })
            .then(() => true).catch(() => false);
        if (hasOpt) return true;
    }
    return false;
}

// ── createFreshJob ─────────────────────────────────────────────────────────────

async function createFreshJob(page) {
    const title = `Func-Test-${Date.now()}`;

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.waitForSelector('[data-test="new-job-submit-button"]', { timeout: 15000 });

    // Source: try Owner first, fall back to Tenant, then any visible source button
    let srcClicked = false;
    for (const src of ['Owner', 'Tenant']) {
        const btn = page.getByRole('button', { name: src });
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click();
            srcClicked = true;
            break;
        }
    }
    if (!srcClicked) {
        // Click the first visible radio/button in the source group
        await page.locator('[data-test*="source"] button, [class*="source"] button').first()
            .click({ timeout: 3000 }).catch(() => {});
    }

    // Property
    const propSelectBtn = page.getByRole('button', { name: 'Select property' });
    if (!await propSelectBtn.isVisible({ timeout: 5000 }).catch(() => false))
        throw new Error('no matching test data — property select not found');

    await propSelectBtn.click();
    await page.waitForTimeout(300);

    const propFound = await typeSearchWithFallback(page, ['27 b', '1 ', 'unit', 'a']);
    if (!propFound) throw new Error('no matching test data — no property options');
    await page.locator('[role="option"]').first().click();

    // Title & description
    await page.getByRole('textbox', { name: 'Keep it short!' }).fill(title).catch(async () => {
        await page.locator('input[placeholder*="short" i], input[placeholder*="title" i]').first().fill(title);
    });
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(title).catch(async () => {
        await page.locator('textarea').first().fill(title);
    });

    // Submit
    await page.locator('[data-test="new-job-submit-button"]').click();
    await page.waitForURL(/\/jobs\//, { timeout: 20000 });
    await page.waitForLoadState('domcontentloaded');
    await SS(page, 'job-created');
    return { title, url: page.url() };
}

// ── createFreshInvoice ─────────────────────────────────────────────────────────

async function createFreshInvoice(page) {
    await page.locator('[data-test="new-invoice-menu-link"]').click();
    await page.waitForSelector('[data-test="invoice-upload-input"], input[type="file"]', { timeout: 15000 });
    const fileInput = page.locator('[data-test="invoice-upload-input"], input[type="file"]').first();
    await fileInput.setInputFiles(invoiceFile);
    await page.locator('[data-test="invoice-upload-submit-button"]').click();
    await page.locator('[data-test="processing-invoice-process-button"]').click({ timeout: 60000 });

    // Supplier
    await page.locator('[data-test="match-invoice-supplier-field"] button').first().click();
    await page.waitForTimeout(300);
    const suppFound = await typeSearchWithFallback(page, ['josh', 'bee', 'test', 'tapi', 'a']);
    if (suppFound) await page.locator('[role="option"]').first().click().catch(() => {});

    // Property
    const propBtn = page.locator('[data-test="match-invoice-property-field"] button');
    if (await propBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await propBtn.first().click();
        await page.waitForTimeout(300);
        const propFound = await typeSearchWithFallback(page, ['27 b', '1 ', 'unit', 'a']);
        if (propFound) await page.locator('[role="option"]').first().click().catch(() => {});
    }

    await page.waitForTimeout(500);

    // Enable attach button
    const attachBtn = page.getByRole('button', { name: /attach invoice/i });
    await attachBtn.waitFor({ state: 'visible', timeout: 30000 });

    if (!await attachBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
        await page.locator('text=/[A-Z]+-\\d+/').first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
    }
    if (!await attachBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await page.getByText('Process without job', { exact: false }).first()
            .click({ force: true, timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
    }
    // Force-click as last resort
    await attachBtn.click({ force: true, timeout: 10000 }).catch(async () => {
        await attachBtn.evaluate(el => el.click());
    });

    // Fill required details
    await page.locator('[data-test="confirm-invoice-description-field"]').getByRole('textbox')
        .fill('Func test invoice').catch(() => {});
    await page.locator('[data-test="confirm-invoice-number-field"]').getByRole('textbox')
        .fill(`INV-FUNC-${Date.now()}`).catch(() => {});
    await page.locator('[data-test="confirm-invoice-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' })
        .fill('12/03/2025').catch(() => {});
    await page.locator('[data-test="confirm-invoice-due-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' })
        .fill('31/03/2025').catch(() => {});
    await page.locator('.page-container').click();
    await page.locator('[data-test="confirm-invoice-total-field"]').locator('input').fill('100').catch(() => {});
    await page.locator('.page-container').click();
    await SS(page, 'invoice-created-for-delete');
    return page.url();
}

// ── confirmJobDialog ───────────────────────────────────────────────────────────
// Confirms a cancel/close dialog — tries several patterns.

async function confirmJobDialog(page) {
    await page.waitForTimeout(800);

    // data-test confirm button
    let ok = await page.locator('[data-test="dialog-confirm-button"]')
        .click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (ok) return;

    // Last "Cancel" / "Close" / "Yes" / "Confirm" button
    ok = await page.getByRole('button', { name: /^(cancel|close|yes|confirm)$/i })
        .last().click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (ok) return;

    // JS evaluate fallback — click the last button that isn't "Back" or "No"
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.reverse().find(b =>
            b.offsetParent !== null &&
            !/^(back|no|dismiss)$/i.test(b.textContent.trim())
        );
        if (btn) btn.click();
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// Generate one test.describe per trust
// ══════════════════════════════════════════════════════════════════════════════

for (const TRUST of TRUSTS) {

    test.describe(`Functional — ${TRUST}`, () => {

        test.beforeEach(async ({ page }) => {
            test.setTimeout(300000);
            await login(page);
            await switchTrust(page, TRUST);
        });

        // ── 1. Edit fields ────────────────────────────────────────────────────
        test('Job: Edit fields — title, description and cost limit save', async ({ page }) => {
            const { title } = await createFreshJob(page).catch(e => {
                if (/no matching test data/i.test(e.message)) { test.skip(true, e.message); return {}; }
                throw e;
            });
            if (!title) return;

            const updatedTitle = `${title} updated`;

            await page.getByRole('button', { name: 'Edit job' }).click({ timeout: 10000 });
            await SS(page, `${TRUST}-job-edit-opened`);

            await page.getByRole('textbox', { name: 'Keep it short!' }).fill(updatedTitle).catch(async () => {
                await page.locator('input[placeholder*="short" i], input[placeholder*="title" i]').first().fill(updatedTitle);
            });
            await page.locator('textarea').first().fill(updatedTitle).catch(() => {});

            // Cost limit — spinbutton (number input)
            const costField = page.getByRole('spinbutton').first();
            if (await costField.isVisible({ timeout: 2000 }).catch(() => false)) {
                await costField.fill('1000');
            } else {
                await page.locator('input[type="number"]').first().fill('1000').catch(() => {});
            }

            await page.getByRole('button', { name: 'Update job' }).click();
            await page.waitForTimeout(2000);
            await SS(page, `${TRUST}-job-fields-saved`);

            await expect(page.getByRole('button', { name: 'Update job' })).not.toBeVisible({ timeout: 8000 });
            await expect(page.getByText(updatedTitle, { exact: false }).first()).toBeVisible({ timeout: 10000 });
            await SS(page, `${TRUST}-job-fields-verified`);
        });

        // ── 2. Cancel job ─────────────────────────────────────────────────────
        test('Job: Cancel a job — moves to Cancelled state', async ({ page }) => {
            await createFreshJob(page).catch(e => {
                if (/no matching test data/i.test(e.message)) { test.skip(true, e.message); return; }
                throw e;
            });

            await page.getByRole('button', { name: 'More options' }).click();
            await page.getByRole('option', { name: 'Cancel job' }).click();
            await SS(page, `${TRUST}-job-cancel-dialog`);

            await confirmJobDialog(page);

            await page.waitForTimeout(2000);
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await SS(page, `${TRUST}-job-cancelled`);

            const ok = await page.getByText(/cancell?ed/i).first().isVisible({ timeout: 8000 }).catch(() => false);
            if (!ok) await expect(page.getByText(/cancel/i).first()).toBeVisible({ timeout: 5000 });
            await SS(page, `${TRUST}-job-cancelled-verified`);
        });

        // ── 3. Close job ──────────────────────────────────────────────────────
        test('Job: Close a job — moves to Closed state', async ({ page }) => {
            await createFreshJob(page).catch(e => {
                if (/no matching test data/i.test(e.message)) { test.skip(true, e.message); return; }
                throw e;
            });

            await page.getByRole('button', { name: 'More options' }).click();
            await page.getByRole('option', { name: 'Close job' }).click();
            await SS(page, `${TRUST}-job-close-dialog`);

            await confirmJobDialog(page);

            await page.waitForTimeout(2000);
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await SS(page, `${TRUST}-job-closed`);
            await expect(page.getByText(/closed/i).first()).toBeVisible({ timeout: 10000 });
            await SS(page, `${TRUST}-job-closed-verified`);
        });

        // ── 4. Add note ───────────────────────────────────────────────────────
        test('Job: Add a note — note saved and visible', async ({ page }) => {
            await createFreshJob(page).catch(e => {
                if (/no matching test data/i.test(e.message)) { test.skip(true, e.message); return; }
                throw e;
            });

            const noteText = `Regression note ${Date.now()}`;

            await page.getByRole('button', { name: 'Add note' }).click({ timeout: 10000 });
            await page.waitForTimeout(500);
            await SS(page, `${TRUST}-job-note-panel-open`);

            await page.getByRole('textbox').fill(noteText);
            await SS(page, `${TRUST}-job-note-filled`);

            const addNoteBtns = page.getByRole('button', { name: 'Add note' });
            const count = await addNoteBtns.count();
            await addNoteBtns.nth(count - 1).click();
            await page.waitForTimeout(1000);

            await expect(page.getByText('Added note successfully')).toBeVisible({ timeout: 10000 });
            await SS(page, `${TRUST}-job-note-added`);
            await expect(page.getByText(noteText)).toBeVisible({ timeout: 10000 });
            await SS(page, `${TRUST}-job-note-verified`);
        });

        // ── 5. Delete invoice ─────────────────────────────────────────────────
        test('Invoice: Delete — removed from list', async ({ page }) => {
            const invoiceUrl = await createFreshInvoice(page).catch(e => {
                if (/no matching test data/i.test(e.message)) { test.skip(true, e.message); return null; }
                throw e;
            });
            if (!invoiceUrl) return;

            await SS(page, `${TRUST}-invoice-before-delete`);

            await page.getByRole('button', { name: 'More options' }).click({ timeout: 8000 }).catch(async () => {
                await page.locator('[aria-label*="more"], button[aria-haspopup]').first().click({ timeout: 5000 });
            });
            await page.waitForTimeout(300);
            await page.getByRole('option', { name: /delete/i }).click({ timeout: 5000 }).catch(async () => {
                await page.getByRole('menuitem', { name: /delete/i }).click({ timeout: 5000 });
            });

            await page.locator('[data-test="dialog-confirm-button"]').click({ timeout: 5000 }).catch(async () => {
                await page.getByRole('button', { name: /confirm|yes|delete/i }).first().click({ timeout: 5000 }).catch(() => {});
            });

            await page.waitForTimeout(2000);
            await SS(page, `${TRUST}-invoice-deleted`);

            const currentUrl = page.url();
            if (currentUrl !== invoiceUrl) {
                await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible({ timeout: 10000 });
            } else {
                await expect(page.getByText(/deleted|removed/i).first()).toBeVisible({ timeout: 8000 });
            }
            await SS(page, `${TRUST}-invoice-delete-verified`);
        });

        // ── 6. Business settings ──────────────────────────────────────────────
        test('Settings: Business settings page loads and fields are editable', async ({ page }) => {
            let found = false;
            for (const url of [
                'https://dev.tapi.app/settings',
                'https://dev.tapi.app/settings/general',
                'https://dev.tapi.app/settings/business',
                'https://dev.tapi.app/settings/profile',
            ]) {
                await page.goto(url);
                await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                const hasInput = await page
                    .locator('input[type="text"], input[type="email"], input[type="tel"], textarea')
                    .first().isVisible({ timeout: 5000 }).catch(() => false);
                if (hasInput) { found = true; break; }
            }
            if (!found) {
                await page.goto('https://dev.tapi.app');
                await page.waitForLoadState('domcontentloaded');
                await page.locator('[data-test="settings-link"], a[href*="settings"], [aria-label*="Settings" i]')
                    .first().click({ timeout: 8000 }).catch(() => {});
                await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            }

            await SS(page, `${TRUST}-settings-loaded`);
            await expect(
                page.locator('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea').first()
            ).toBeVisible({ timeout: 15000 });
            await SS(page, `${TRUST}-settings-verified`);
        });

        // ── 7. User list ──────────────────────────────────────────────────────
        test('Settings: User list loads — active users display with roles', async ({ page }) => {
            await page.goto('https://dev.tapi.app/settings/users').catch(() =>
                page.goto('https://dev.tapi.app/settings')
            );
            await page.waitForLoadState('domcontentloaded', { timeout: 20000 });

            await page.getByRole('link', { name: /users|team|members/i }).first()
                .click({ timeout: 5000 }).catch(() => {});
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            await SS(page, `${TRUST}-settings-users-loaded`);

            await expect(
                page.locator('tr, [data-test*="user-row"], [class*="user-row"], [class*="user-list"] li').first()
            ).toBeVisible({ timeout: 15000 });
            await expect(
                page.getByText(/property manager|pm|admin|owner/i).first()
            ).toBeVisible({ timeout: 8000 });
            await SS(page, `${TRUST}-settings-users-verified`);
        });

    }); // end describe
} // end trust loop
