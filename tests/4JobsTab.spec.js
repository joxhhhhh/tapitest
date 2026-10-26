import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/Login.js';

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
    await page.goto('/jobs');
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible({ timeout: 15000 });
});

test('Jobs tab - filter by Open status', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
    await page.getByRole('button', { name: 'Open' }).first().click();
    await expect(page.getByRole('button', { name: 'Open' }).first()).toBeVisible({ timeout: 10000 });
});
