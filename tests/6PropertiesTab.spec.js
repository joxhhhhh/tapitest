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

test('Properties tab loads and displays property list', async ({ page }) => {
    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/properties/);
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
});

test('Properties tab - search for a property', async ({ page }) => {
    await page.getByRole('link', { name: 'Properties' }).click();
    await page.getByRole('searchbox').fill('Test Road');
    await expect(page.getByText('Test Road')).toBeVisible();
});
