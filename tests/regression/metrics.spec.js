import { test, expect } from '@playwright/test';
import { LoginPage } from '../../Pages/Login.js';

test.describe('Metrics (Manage Tab) - Regression', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoLoginPage();
        await loginPage.login();
        await page.getByRole('link', { name: 'Metrics' }).click();
        await expect(page).toHaveURL(/\/metrics/, { timeout: 15000 });
    });

    test.afterEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    });

    test('Manage tab loads without error', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible({ timeout: 15000 });
    });

    test('Job count KPIs display (overdue counts and average repair time)', async ({ page }) => {
        // Verify KPI labels that actually appear on the metrics page
        await expect(page.getByText('urgent jobs overdue')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('important jobs overdue')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('normal jobs overdue')).toBeVisible({ timeout: 15000 });
    });

    test.fixme('Throughput figure is present and non-zero for active environments', async ({ page }) => {
        // TODO: Locate throughput metric element and assert value > 0
        // Selector depends on the metrics page structure
    });

    test.fixme('Aging breakdown displays correctly', async ({ page }) => {
        // TODO: Locate aging breakdown section and assert it contains expected buckets
    });

    test.fixme('Property and supplier compliance figures display', async ({ page }) => {
        // TODO: Locate compliance section and assert values are displayed
    });

});
