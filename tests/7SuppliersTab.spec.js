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

test('Suppliers tab loads and displays supplier list', async ({ page }) => {
    await page.getByRole('link', { name: 'Suppliers' }).click();
    await expect(page).toHaveURL(/\/suppliers/);
    await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
});

test('Suppliers tab - search for a supplier', async ({ page }) => {
    await page.getByRole('link', { name: 'Suppliers' }).click();
    await page.getByRole('searchbox').fill('test');
    await expect(page.getByText('All is well plumbing test test')).toBeVisible();
});
