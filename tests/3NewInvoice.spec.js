import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoginPage } from '../Pages/Login.js';
import { NewInvoice } from '../Pages/NewInvoiceTab.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'uploadfiles', 'Invoice Sample.pdf');

test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login();
});

test.afterEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.logout();
});

test('Create New Invoice', async ({ page }) => {
    test.slow();

    const newInvoice = new NewInvoice(page);
    await newInvoice.uploadInvoice(file, 'josh', '27 B', 'Josh Sali');

    await page.locator('[data-test="processing-invoice-process-button"]').click();
    await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible();
});
