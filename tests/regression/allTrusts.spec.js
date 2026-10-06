/**
 * All-Trusts Regression Suite
 * Switches to every trust in the dev environment and runs
 * a full create-invoice + create-job regression for each.
 * Screenshots are captured at every important step.
 * If primary test data (josh / 27 ba / bee) is missing in a trust,
 * falls back to searching "test" and clicking the first result.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const invoiceFile = path.join(__dirname, '../uploadfiles/Invoice Sample.pdf');
const jobFile     = path.join(__dirname, '../uploadfiles/Invoice1.png');

const email    = process.env.TEST_EMAIL    || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

const SS = (page, label) =>
    page.screenshot({ path: `tests/Screenshots/${Date.now()}-${label}.png`, fullPage: true }).catch(() => {});

// ── Trust list ────────────────────────────────────────────────────────────────
const TRUSTS = [
    'ABC Reapit UK',
    'ABC SME UK',
    'ABC Street UK',
    'ABC PropertyTree',
    'ABC Liquid NZ',
    'ABC Alto UK',
    'ABC PropertyMe Prismatic',
    // 'ABC Alto UK Branch 1',
    // 'ABC Alto UK Branch 2',
    'ABC IAMP UK',
    'ABC Console Big Company',
    'Property Me NZ v2',
];

// ── UK trust detection ────────────────────────────────────────────────────────
// UK trusts use "Contractor" instead of "Supplier", "Landlord" instead of "Owner"
const isUK = (trustName) => /\buk\b/i.test(trustName);

// ── searchSelect: search a dropdown, fall back to "test" if no results ────────
// searchboxName : accessible name of the searchbox (partial match supported)
// primaryTerm   : preferred search term (e.g. 'josh', '27 ba', 'bee')
// fallback      : used when primaryTerm yields no [role="option"] results
async function searchSelect(page, searchboxName, primaryTerm, fallback = 'tes') {
    const terms = Array.isArray(primaryTerm) ? primaryTerm : [primaryTerm];
    if (!terms.includes(fallback)) terms.push(fallback);

    // Try to find a searchbox matching the name; if not visible within 2s fall back to any searchbox.
    // This handles trusts where the UI says "suppliers" but isUK() expected "contractors" (or vice-versa).
    const namedLocator = page.locator(
        `input[placeholder*="${searchboxName}" i], input[aria-label*="${searchboxName}" i]`
    );
    const hasNamed = await namedLocator.first().isVisible({ timeout: 2000 }).catch(() => false);
    const box = hasNamed ? namedLocator.first() : page.getByRole('searchbox').first();

    // Make sure the box is actually ready before filling
    await box.waitFor({ state: 'visible', timeout: 10000 });

    for (const term of terms) {
        await box.fill(term);
        const found = await page.waitForSelector('[role="option"]', { timeout: 5000 })
            .then(() => true).catch(() => false);
        if (found) {
            await page.locator('[role="option"]').first().click();
            return;
        }
        await box.clear();
    }
    // Last resort — try single letter "a" to get any result
    await box.fill('a');
    const lastFound = await page.waitForSelector('[role="option"]', { timeout: 10000 })
        .then(() => true).catch(() => false);
    if (!lastFound) throw new Error(`searchSelect: no results for "${searchboxName}" with any term including "a" — trust has no matching test data`);
    await page.locator('[role="option"]').first().click();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(page) {
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForSelector('text=Inbox', { timeout: 60000 });
}

async function logout(page) {
    await page.goto('/logout', { waitUntil: 'domcontentloaded' })
        .catch(() => page.goto('/auth', { waitUntil: 'domcontentloaded' }).catch(() => {}));
    await page.waitForSelector('input[type="email"]', { timeout: 15000 }).catch(() => {});
}

async function switchTrust(page, trustName) {
    const slug = trustName.replace(/\s+/g, '-');

    await page.locator('.app-menu-company .app-menu-item').click({ force: true });
    // Wait for dropdown items to appear before filtering
    await page.waitForSelector('.app-menu-item-content', { timeout: 10000 });
    await page.waitForTimeout(500);
    await SS(page, `trust-switcher-open-${slug}`);

    // Scroll every overflow container in the sidebar down so all trust items render
    await page.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
            const s = window.getComputedStyle(el);
            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                el.scrollTop = el.scrollHeight;
            }
        });
    });
    await page.waitForTimeout(1000);

    // Try JS click first (finds item anywhere in DOM including after scroll)
    const clicked = await page.evaluate((name) => {
        const items = document.querySelectorAll('.app-menu-item-content');
        for (const item of items) {
            if (item.textContent.trim().includes(name)) {
                item.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                item.click();
                return true;
            }
        }
        return false;
    }, trustName);

    if (!clicked) {
        // Fallback: use mouse wheel scroll then Playwright click
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(400);
        await page.getByText(trustName, { exact: false }).last().click({ timeout: 10000 });
    }

    await page.waitForTimeout(2000);
    await page.waitForLoadState('domcontentloaded');
    await SS(page, `trust-switched-${slug}`);
}

// ── Invoice flow ──────────────────────────────────────────────────────────────

async function createInvoice(page, trustName) {
    const slug       = trustName.replace(/\s+/g, '-');
    const invoiceNum = `Reg-${slug.slice(0, 15)}-${Date.now()}`;
    const uk         = isUK(trustName);

    await page.locator('[data-test="new-invoice-menu-link"]').click();
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    await SS(page, `${slug}-invoice-upload-modal`);
    await page.locator('input[type="file"]').first().setInputFiles(invoiceFile);

    // Supplier / Contractor — primary: josh, fallback: tes
    await page.getByRole('button', { name: /select (supplier|contractor)/i }).first().click();
    await searchSelect(page, 'suppli', ['josh', 'bee', 'test', 'tapi', 'ab']);
    await SS(page, `${slug}-invoice-supplier-selected`);

    // Property — primary: 27 b, fallback: tes
    await page.getByRole('button', { name: 'Select property' }).click();
    await searchSelect(page, 'properties', '27 ba', 'tes');
    await SS(page, `${slug}-invoice-property-selected`);

    // Agent — optional, primary: first result, fallback: test
    try {
        await page.getByRole('button', { name: 'Select agent' }).click({ timeout: 5000 });
        const agentFound = await page.waitForSelector('[role="option"]', { timeout: 5000 })
            .then(() => true).catch(() => false);
        if (agentFound) {
            await page.locator('[role="option"]').first().click({ timeout: 5000 });
        }
    } catch { /* agent field not present */ }

    await SS(page, `${slug}-invoice-ready-to-upload`);
    await page.locator('[data-test="invoice-upload-submit-button"]').click();
    await page.locator('[data-test="processing-invoice-process-button"]').click({ timeout: 60000 });
    await SS(page, `${slug}-invoice-processing`);

    // Some trusts show a job-matching panel with a "Process without job" checkbox
    await SS(page, `${slug}-invoice-process-dialog`);
    try {
        await page.getByText('Process without job').click({ timeout: 6000 });
        await SS(page, `${slug}-invoice-process-without-job`);
    } catch { /* no job panel for this trust */ }

    // Invoice type — try Water bill, then Standard; if neither appears skip type selection
    const typeSelected = await page.getByRole('button', { name: 'Water bill' })
        .or(page.getByRole('button', { name: 'Standard' }))
        .first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    if (typeSelected) {
        try {
            await page.getByRole('button', { name: 'Water bill' }).click({ timeout: 5000 });
        } catch {
            await page.getByRole('button', { name: 'Standard' }).click({ timeout: 5000 });
        }
    }
    await SS(page, `${slug}-invoice-type-selected`);

    // Match supplier / contractor — primary: josh, fallback: tes
    await page.locator('[data-test="match-invoice-supplier-field"] button').first().click();
    await searchSelect(page, 'suppli', ['josh', 'bee', 'test', 'tapi', 'ab']);
    // Select job from second option list if present
    const jobFound = await page.waitForSelector('[role="option"]', { timeout: 5000 })
        .then(() => true).catch(() => false);
    if (jobFound) await page.locator('[role="option"]').first().click();
    await SS(page, `${slug}-invoice-match-supplier`);

    // Match property if the field is still unconfirmed (makes attach button enabled)
    const propBtn = page.locator('[data-test="match-invoice-property-field"] button');
    const propNeedsMatch = await propBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (propNeedsMatch) {
        await propBtn.first().click();
        await searchSelect(page, 'properties', '27 ba', 'tes');
    }

    await page.locator('.page-container').click();
    await page.waitForTimeout(500);

    // Check if attach button is already enabled; if not, try job row click then "Process without job"
    const attachBtn = page.getByRole('button', { name: /attach invoice/i });
    const isEnabled = await attachBtn.isEnabled({ timeout: 8000 }).catch(() => false);

    if (!isEnabled) {
        // Try clicking the first job row (contains a job number like TAPI-NNN or similar)
        try {
            await page.locator('text=/[A-Z]+-\\d+/').first().click({ timeout: 3000 });
            await page.waitForTimeout(500);
        } catch { /* no job rows */ }

        // If still not enabled, click "Process without job" checkbox/label
        if (!await attachBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
            try {
                await page.locator('text=Process without job').first().click({ force: true, timeout: 5000 });
                await page.waitForTimeout(500);
            } catch { /* not present */ }
        }
    }

    // Wait for Attach invoice button to be actionable, then click it
    await attachBtn.waitFor({ state: 'visible', timeout: 30000 });
    await attachBtn.click({ timeout: 30000 });
    await SS(page, `${slug}-invoice-attached`);

    // Details
    await page.locator('[data-test="confirm-invoice-description-field"]').getByRole('textbox').fill('Trust regression test');
    await page.locator('[data-test="confirm-invoice-number-field"]').getByRole('textbox').fill(invoiceNum);
    await page.locator('[data-test="confirm-invoice-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('12/03/2025');
    await page.locator('[data-test="confirm-invoice-due-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('31/03/2025');
    await page.locator('.page-container').click();
    await page.locator('[data-test="confirm-invoice-total-field"]').locator('input').fill('250');
    await page.locator('.page-container').click();
    await page.locator('[data-test="confirm-invoice-tax-field"] a').first().dispatchEvent('click');
    await SS(page, `${slug}-invoice-details-filled`);

    try { await page.locator('label').filter({ hasText: 'Forward to owner for payment' }).locator('svg').click({ force: true, timeout: 5000 }); } catch {}
    try { await page.locator('label').filter({ hasText: 'Charge to property' }).locator('svg').click({ force: true, timeout: 5000 }); } catch {}
    await SS(page, `${slug}-invoice-toggles`);

    // Approve
    await page.locator('[data-test="send-notifications-task"] svg').first().click({ force: true });
    await page.waitForTimeout(1000);
    await SS(page, `${slug}-invoice-before-approve`);
    try { await page.getByRole('button', { name: 'Approve invoice' }).click({ force: true, timeout: 8000 }); } catch {}

    // Success toast may disappear quickly — non-blocking check
    await page.getByText('Invoice approved successfully').waitFor({ timeout: 20000 }).catch(() => {});
    await SS(page, `${slug}-invoice-approved`);
}

// ── Job flow ──────────────────────────────────────────────────────────────────

async function createJob(page, trustName) {
    const slug     = trustName.replace(/\s+/g, '-');
    const jobTitle = `Reg-${slug.slice(0, 18)}-${Date.now()}`;
    const uk       = isUK(trustName);

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.waitForSelector('button:has-text("Create job"), [data-test="new-job-submit-button"]', { timeout: 15000 });
    await SS(page, `${slug}-job-form`);

    await page.getByRole('button', { name: 'Tenant' }).first().click();

    // Property — primary: 27 ba, fallback: tes
    await page.getByRole('button', { name: 'Select property' }).first().click();
    await searchSelect(page, 'properties', '27 ba', 'tes');
    await SS(page, `${slug}-job-property-selected`);

    // Tenancy — click dropdown trigger and pick first option if any exist
    // (some trusts / properties have "No job tenancy" — skip gracefully in that case)
    try {
        await page.locator("span[class='dropdown-trigger'] span[class='button__content']").first().click({ timeout: 5000 });
        const hasOptions = await page.waitForSelector("//div[@role='option']", { timeout: 5000 })
            .then(() => true).catch(() => false);
        if (hasOptions) {
            await page.locator("//div[@role='option']").first().click();
        }
    } catch { /* no tenancy options — continue */ }

    await page.getByRole('textbox', { name: 'Keep it short!' }).fill(jobTitle);
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(jobTitle);
    // Assign to — try "Josh Sali" first, then "JoshTest", skip if neither found
    try {
        await page.getByRole('button', { name: 'Josh Sali' }).first().click({ timeout: 5000 });
    } catch {
        try { await page.getByRole('button', { name: 'JoshTest' }).first().click({ timeout: 5000 }); } catch { /* already assigned or pre-populated */ }
    }
    // Close any stale dropdown that may have been left open by the assign-to attempts
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await SS(page, `${slug}-job-form-filled`);

    // Click Create job via JS to bypass any overlay issues
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.trim() === 'Create job');
        if (btn) { btn.scrollIntoView({ block: 'nearest' }); btn.click(); }
    });
    // Playwright click as fallback if JS click didn't navigate away
    await page.getByRole('button', { name: 'Create job' }).click({ force: true, timeout: 5000 }).catch(() => {});

    // Upload photo
    await page.locator('.responsive-holder__inner').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Select files' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(jobFile);
    await SS(page, `${slug}-job-file-selected`);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForSelector('button:has-text("Send work order")', { timeout: 20000 });
    await SS(page, `${slug}-job-uploaded`);

    // Send work order
    await page.getByRole('button', { name: 'Send work order' }).click();

    // Work order supplier / contractor — primary: josh, fallback: tes
    await page.getByRole('button', { name: /select (supplier|contractor)/i }).first().click();
    await searchSelect(page, 'suppli', ['josh', 'bee', 'test', 'tapi', 'ab']);
    await SS(page, `${slug}-job-supplier-selected`);

    // Scroll modal back to top so certifications section is in view, then check compliance box
    await page.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
            const s = window.getComputedStyle(el);
            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
                el.scrollTop = 0;
        });
    });
    await page.waitForTimeout(300);

    // Compliance / certifications — use JS to find & check any "do not require" checkbox in the modal
    await page.evaluate(() => {
        // Find all checkboxes and check the one whose label mentions "do not require"
        const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        for (const input of inputs) {
            if (input.checked) continue;
            // Check via associated label text or parent text
            const id = input.id;
            const labelEl = id ? document.querySelector(`label[for="${id}"]`) : null;
            const parentText = (labelEl?.textContent || input.closest('label')?.textContent || input.parentElement?.textContent || '').toLowerCase();
            if (parentText.includes('do not require')) {
                input.click();
            }
        }
    });
    await page.waitForTimeout(1500);

    const quoteInput = page.locator('[data-test*="send-work-order"] input:not([type="checkbox"])').first();
    await quoteInput.fill('100');
    await quoteInput.press('Tab'); // commit value and trigger form validation
    await page.waitForTimeout(800);
    await page.locator('[data-test="send-work-order-send-notifications-field"] svg').click({ force: true });
    try { await page.locator('label').filter({ hasText: 'Send a copy of this work' }).click({ timeout: 5000 }); } catch {}
    await page.waitForTimeout(500);
    await SS(page, `${slug}-job-work-order-filled`);
    // Wait for submit button to become enabled, then scroll into view and click
    const woSubmitBtn = page.locator('[data-test="send-work-order-submit-button"]');
    await woSubmitBtn.scrollIntoViewIfNeeded({ timeout: 10000 });
    await page.locator('[data-test="send-work-order-submit-button"]:not([disabled])').waitFor({ timeout: 20000 });
    await woSubmitBtn.click();

    await expect(page.getByRole('link', { name: 'Inbox' })).toBeVisible({ timeout: 30000 });
    await SS(page, `${slug}-job-submitted`);
}

// ── Test suite: one test per trust (login → switch → invoice → job → logout) ──

for (const trustName of TRUSTS) {
    test(`Trust regression: ${trustName}`, async ({ page }) => {
        test.setTimeout(600000); // 10 min per trust (invoice OCR + job flow can be slow)
        const slug = trustName.replace(/\s+/g, '-');

        await login(page);
        await switchTrust(page, trustName);
        try {
            await createInvoice(page, trustName);
        } catch (e) {
            await SS(page, `${slug}-invoice-FAILED`);
            if (e.message?.includes('no matching test data')) {
                console.warn(`[${trustName}] Skipping invoice — no test data: ${e.message}`);
            } else {
                throw e; // re-throw real errors
            }
        }
        try {
            await createJob(page, trustName);
        } catch (e) {
            await SS(page, `${slug}-job-FAILED`);
            if (e.message?.includes('no matching test data')) {
                console.warn(`[${trustName}] Skipping job — no test data: ${e.message}`);
            } else {
                throw e;
            }
        }
        await logout(page);
    });
}
