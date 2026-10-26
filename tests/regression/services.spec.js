import { test, expect } from '@playwright/test';
import { LoginPage } from '../../Pages/Login.js';

test.describe('Services & Assets - Regression', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoLoginPage();
        await loginPage.login();
    });

    test.afterEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    });

    test.fixme('Service generates a job on schedule: job created with correct fields and linked to correct property', async ({ page }) => {
        // TODO: This test verifies scheduled service job creation.
        // Requires either:
        //   (a) Triggering a service manually and verifying the resulting job, or
        //   (b) Waiting for a scheduled service to fire and checking the jobs list
        //
        // Steps (manual trigger approach):
        //   1. Navigate to the Services section
        //   2. Find an active scheduled service
        //   3. Trigger it manually (if UI allows)
        //   4. Navigate to Jobs list
        //   5. Verify a new job appeared with correct property, title, and service reference
        //
        // Note: Scheduled job creation may need to be verified via API or
        // by checking the job list after the expected schedule time.
    });

});
