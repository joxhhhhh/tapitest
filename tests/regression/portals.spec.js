import { test, expect } from '@playwright/test';
import { LoginPage } from '../../Pages/Login.js';

// NOTE: Portal tests require separate credentials and portal URLs.
// Set these in your .env file:
//   OWNER_EMAIL, OWNER_PASSWORD, OWNER_PORTAL_URL
//   SUPPLIER_EMAIL, SUPPLIER_PASSWORD, SUPPLIER_PORTAL_URL
//   TENANT_EMAIL, TENANT_PASSWORD

test.describe('Owner Portal - Regression', () => {

    test.fixme('Owner can log in and view their properties and jobs', async ({ page }) => {
        // TODO: Navigate to owner portal URL
        // Log in with owner credentials
        // Verify properties and jobs are visible
        // Example:
        //   await page.goto(process.env.OWNER_PORTAL_URL);
        //   await page.locator('input[type="email"]').fill(process.env.OWNER_EMAIL);
        //   await page.locator('input[type="password"]').fill(process.env.OWNER_PASSWORD);
        //   await page.locator('input[type="password"]').press('Enter');
        //   await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
    });

    test.fixme('Owner receives and can action a quote notification', async ({ page }) => {
        // TODO: Send quote from PM side, then log in as owner
        // Find quote notification, approve or reject
        // Verify job status updates in main app
    });

});

test.describe('Supplier Portal - Regression', () => {

    test.fixme('Supplier can view and action a work order', async ({ page }) => {
        // TODO: Log in to supplier portal with supplier credentials
        // Find work order, verify details match what was sent from main app
    });

    test.fixme('Supplier can submit a quote', async ({ page }) => {
        // TODO: Log in to supplier portal
        // Find quote request, fill in amount and line items, submit
        // Verify quote appears on job in main app
    });

    test.fixme('Supplier can mark a job complete', async ({ page }) => {
        // TODO: Log in to supplier portal, find an active job
        // Mark as complete, verify status updates in main app
    });

});

test.describe('Tenant Concierge - Regression', () => {

    test.fixme('Tenant submits a maintenance request: job created in Tapi 2 correctly', async ({ page }) => {
        // TODO: Currently cancelled - needs to be tested in dev environment
        // Log in as tenant, submit maintenance request
        // Verify job appears in main Tapi 2 app with correct property and details
    });

});
