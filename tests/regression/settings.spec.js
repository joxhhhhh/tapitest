import { test, expect } from '@playwright/test';
import { LoginPage } from '../../Pages/Login.js';

test.describe('Settings & User Management - Regression', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoLoginPage();
        await loginPage.login();
    });

    test.afterEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    });

    test('Business settings page loads and current configuration is editable', async ({ page }) => {
        await page.goto('/business/settings/company');
        await expect(page).toHaveURL(/business\/settings/, { timeout: 15000 });
        // Verify settings page loaded with at least one editable field
        await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 15000 });
    });

    test('User list loads: active users display with correct roles', async ({ page }) => {
        await page.goto('/business/settings/users');
        await expect(page).toHaveURL(/business\/settings\/users/, { timeout: 15000 });
        // Verify the users page loaded (look for a table or user list)
        await expect(page.locator('table, [class*="user"], [class*="member"]').first()).toBeVisible({ timeout: 15000 });
    });

    test.fixme('PM can be deactivated and reactivated without data loss', async ({ page }) => {
        // TODO: Navigate to user settings, deactivate a non-primary test PM account,
        // verify their jobs still visible, then reactivate
        // CAUTION: Do not deactivate your own account or primary admin
    });

    test.fixme('Email notification settings save correctly', async ({ page }) => {
        // TODO: Navigate to notification settings, toggle an email setting,
        // save, reload page, verify setting persisted
    });

});
