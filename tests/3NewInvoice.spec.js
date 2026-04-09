import { test, expect } from '@playwright/test';
import path from 'node:path';
import { LoginPage } from '../Pages/Login';
import { NewInvoice } from '../Pages/NewInvoiceTab';

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
    await newInvoice.uploadInvoice(file, 'Tapi Test', '11 Dixon Street', 'Josh Sali');

    await page.locator('[data-test="processing-invoice-process-button"]').click();
    await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible();
});
