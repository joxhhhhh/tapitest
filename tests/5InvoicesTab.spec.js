import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/Login';

test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login();
});

test.afterEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.logout();
});

test('Invoices tab loads and displays invoice list', async ({ page }) => {
    await page.getByRole('link', { name: 'Invoices' }).click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
});
