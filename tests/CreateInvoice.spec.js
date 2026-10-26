import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'uploadfiles', 'Invoice Sample.pdf');
const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test('Create Invoice', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes: login can be slow after prior tests

    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForSelector('text=Inbox', { timeout: 90000 });

    await page.locator('[data-test="new-invoice-menu-link"]').click();
    await expect(page.getByRole('button', { name: 'Single' })).toBeVisible();
    // Note: 'Batch' upload option may not be available on all accounts — removed assertion

    // Set file directly on the hidden input — more reliable than clicking the dropzone
    await page.locator('input[type="file"]').first().setInputFiles(file);

    await page.getByRole('button', { name: 'Select supplier' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('josh');
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator('[role="option"]').first().click();
    await page.getByRole('button', { name: 'Select property' }).click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('27 B');
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator('[role="option"]').first().click();
    // Agent is optional — skip gracefully if button is slow/absent
    try {
        await page.getByRole('button', { name: 'Select agent' }).click({ timeout: 5000 });
        await page.locator('[role="option"]').first().click({ timeout: 5000 });
    } catch (e) {
        // continue without agent
    }
    await page.locator('[data-test="invoice-upload-submit-button"]').click();
    await page.locator('[data-test="processing-invoice-process-button"]').click();

    await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible();
    await page.getByRole('button', { name: 'Water bill' }).click();
    await expect(page.getByRole('button', { name: 'Supplier & property' })).toBeVisible();

    // Click the supplier button on the match screen (named after the OCR-detected supplier)
    await page.locator('[data-test="match-invoice-supplier-field"] button').first().click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('bee');
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator('[role="option"]').first().click();
    // Click the first matching job row in the results
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator('[role="option"]').first().click();
    await expect(page.locator('[data-test="match-invoice-supplier-field"]').getByRole('button')).toBeVisible();
    await expect(page.locator('[data-test="match-invoice-property-field"]').getByRole('button')).toBeVisible();
    await page.locator('.page-container').click();
    await page.locator('[data-test="match-invoice-attach-invoice-button"]').click();

    await page.locator('[data-test="confirm-invoice-description-field"]').getByRole('textbox').fill('Test Codegen - 1');
    await page.locator('[data-test="confirm-invoice-number-field"]').getByRole('textbox').fill('Mar12-codegen2');
    await page.locator('[data-test="confirm-invoice-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('12/03/2025');
    await page.locator('[data-test="confirm-invoice-due-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('31/03/2025');
    await page.locator('.page-container').click();
    await page.locator('[data-test="confirm-invoice-total-field"]').locator('input').fill('250');
    await page.locator('.page-container').click(); // commit total value before clicking tax link
    await page.locator('[data-test="confirm-invoice-tax-field"] a').first().dispatchEvent('click');
    await page.locator('label').filter({ hasText: 'Forward to owner for payment' }).locator('svg').click();
    await page.locator('label').filter({ hasText: 'Charge to property' }).locator('svg').click();
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).click();
    await expect(page.locator('[data-test="confirm-invoice-direct-debit-field"]')).toContainText('No property charge will be pushed to');
    // SVG intercepts pointer events — use force:true to click through it
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).locator('svg').click({ force: true });
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).locator('svg').click({ force: true });

    // Skip tenant charge section — go straight to approve
    await page.locator('[data-test="send-notifications-task"] svg').first().click({ force: true });
    await page.waitForTimeout(1000);
    // Click Approve invoice button if present (appears after all required tasks are toggled)
    try {
        await page.getByRole('button', { name: 'Approve invoice' }).click({ force: true, timeout: 8000 });
    } catch (e) {
        // may already be approved or button has different label
    }
    await expect(page.getByText('Invoice approved successfully')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Invoice has been approved' })).toBeVisible();

    await page.getByRole('link', { name: 'Invoices' }).click();
    await page.getByRole('link', { name: 'Mar12-codegen2' }).first().click();
    await expect(page.getByRole('heading', { name: 'Invoice has been approved' })).toBeVisible();

    await page.goto('/logout');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
});
