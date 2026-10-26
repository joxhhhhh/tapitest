import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoginPage } from '../../Pages/Login.js';
import { NewInvoice } from '../../Pages/NewInvoiceTab.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoicePdf = path.join(__dirname, '../uploadfiles', 'Invoice Sample.pdf');
const invoiceImg = path.join(__dirname, '../uploadfiles', 'Invoice1.png');

test.describe('Invoices - Regression', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoLoginPage();
        await loginPage.login();
    });

    test.afterEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    });

    // ── Upload ────────────────────────────────────────────────────────────────

    test('Upload an invoice: file accepted and processing screen shown', async ({ page }) => {
        test.slow();

        const newInvoice = new NewInvoice(page);
        await newInvoice.uploadInvoice(invoicePdf, 'josh', '27 B', 'Josh Sali');

        // OCR processing screen should appear — allow extra time on first run (cold start)
        await expect(page.locator('[data-test="processing-invoice-process-button"]')).toBeVisible({ timeout: 60000 });
    });

    // ── Match — Standard ──────────────────────────────────────────────────────

    test('Match invoice to a job (Standard type): processes correctly', async ({ page }) => {
        test.slow();

        const newInvoice = new NewInvoice(page);
        await newInvoice.uploadInvoice(invoicePdf, 'josh', '27 B', 'Josh Sali');

        await page.locator('[data-test="processing-invoice-process-button"]').click();

        await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible();

        // Select Standard type
        await page.getByRole('button', { name: 'Standard' }).click();
        await expect(page.getByRole('button', { name: 'Supplier & property' })).toBeVisible();
    });

    // ── Match — Water Bill ────────────────────────────────────────────────────

    test('Match invoice to a job (Water Bill type): processes correctly', async ({ page }) => {
        test.slow();

        const newInvoice = new NewInvoice(page);
        await newInvoice.uploadInvoice(invoicePdf, 'josh', '27 B', 'Josh Sali');

        await page.locator('[data-test="processing-invoice-process-button"]').click();

        await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible({ timeout: 30000 });
        await page.getByRole('button', { name: 'Water bill' }).click();
        await expect(page.getByRole('button', { name: 'Supplier & property' })).toBeVisible();
    });

    // ── Match — Council Rate ──────────────────────────────────────────────────

    test('Match invoice to a job (Council Rate type): processes correctly', async ({ page }) => {
        test.slow();

        const newInvoice = new NewInvoice(page);
        await newInvoice.uploadInvoice(invoicePdf, 'josh', '27 B', 'Josh Sali');

        await page.locator('[data-test="processing-invoice-process-button"]').click();

        await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible({ timeout: 30000 });
        await page.getByRole('button', { name: 'Council rate' }).click();
        await expect(page.getByRole('button', { name: 'Supplier & property' })).toBeVisible();
    });

    // ── Approve ───────────────────────────────────────────────────────────────

    test.fixme('Approve an invoice: trust debited, invoice moves to Approved', async ({ page }) => {
        // TODO: Upload → match → fill details → submit → verify Approved status
        // Requires stable test data and full multi-step flow
    });

    // ── Compliance card ───────────────────────────────────────────────────────

    test.fixme('Compliance card flow at approval (pass): certificate uploaded, valid-to date set', async ({ page }) => {
        // TODO: Approve invoice with a supplier that requires compliance
        // Upload certificate, set valid-to date, verify compliance card passes
    });

    test.fixme('Compliance card flow at approval (fail): remedial job created correctly', async ({ page }) => {
        // TODO: Attempt to approve invoice where compliance check fails
        // Verify remedial job is automatically created
    });

    // ── Delete ────────────────────────────────────────────────────────────────

    test.fixme('Delete an invoice: confirm action removes invoice from list', async ({ page }) => {
        // TODO: Find a draft/test invoice, click delete, confirm, verify removed from list
    });

});
