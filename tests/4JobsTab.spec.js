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

test('Jobs tab loads and displays job list', async ({ page }) => {
    await page.getByRole('link', { name: 'Jobs' }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
});

test('Jobs tab - filter by Open status', async ({ page }) => {
    await page.getByRole('link', { name: 'Jobs' }).click();
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
});
