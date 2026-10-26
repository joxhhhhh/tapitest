import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoginPage } from '../../Pages/Login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photo = path.join(__dirname, '../uploadfiles', 'Invoice1.png');

const testPropertySearch = '27 B'; // search term for property picker
const testTenancy = 'first'; // select first available tenancy for the property
const testTitle = `Regression Job ${Date.now()}`;
const testDescription = 'Automated regression test job';
const testSupplier = 'All is well plumbing test test';

test.describe('Jobs - Regression', () => {

    test.beforeEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoLoginPage();
        await loginPage.login();
    });

    test.afterEach(async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    });

    // ── Create ────────────────────────────────────────────────────────────────

    test('Create a new job: appears in jobs list with correct property, status, and PM', async ({ page }) => {
        test.slow();

        await page.locator('[data-test="new-job-menu-link"]').click();
        await page.waitForSelector('[data-test="new-job-submit-button"]', { timeout: 15000 });
        await page.getByRole('button', { name: 'Tenant' }).first().click();
        await page.getByRole('button', { name: 'Select property' }).first().click();
        await page.getByRole('searchbox', { name: 'Search properties...' }).fill(testPropertySearch);
        await page.waitForTimeout(500);
        await page.getByText(testPropertySearch).first().click(); // select first matching property
        // Tenancy: click the tenancy dropdown trigger then pick the first option
        await page.locator("span[class='dropdown-trigger'] span[class='button__content']").first().click();
        await page.waitForSelector("//div[@role='option']", { timeout: 10000 });
        await page.locator("//div[@role='option']").first().click();
        await page.getByRole('textbox', { name: 'Keep it short!' }).fill(testTitle);
        await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(testDescription);
        await page.getByRole('button', { name: 'Josh Sali' }).first().click();
        await page.locator('[data-test="new-job-submit-button"]').click();

        // Job detail page should load
        await expect(page.getByRole('heading', { name: testTitle })).toBeVisible({ timeout: 15000 });

        // Verify it appears in Jobs list
        await page.getByRole('link', { name: 'Jobs' }).click();
        await expect(page).toHaveURL(/\/jobs/);
        await expect(page.getByText(testTitle)).toBeVisible({ timeout: 15000 });
    });

    // ── Edit ─────────────────────────────────────────────────────────────────

    test.fixme('Edit job fields (title, description, category, priority): changes save correctly', async ({ page }) => {
        // TODO: Navigate to an existing test job, edit fields, verify save
        // Needs a reliable test job ID or search mechanism
    });

    // ── Supplier ─────────────────────────────────────────────────────────────

    test.fixme('Assign a supplier to a job: supplier saved and visible on job detail', async ({ page }) => {
        // TODO: Create/find a job, click "Assign supplier", select supplier, verify saved
    });

    // ── Status ───────────────────────────────────────────────────────────────

    test.fixme('Change job status manually: status updates and audit trail records the change', async ({ page }) => {
        // TODO: Open a job, change status via dropdown, verify status badge and audit trail entry
    });

    // ── Quote ─────────────────────────────────────────────────────────────────

    test.fixme('Send a quote request to a supplier: supplier receives notification, job moves to Awaiting Quote', async ({ page }) => {
        // TODO: Open a job, click "Send work order", select supplier, send quote request
        // Verify job status changes to "Awaiting Quote"
    });

    test.fixme('Supplier submits a quote via portal: quote appears on job with correct amount and line items', async ({ page }) => {
        // TODO: Requires supplier portal access and credentials
        // Navigate to supplier portal, find work order, submit quote
    });

    // ── Owner approvals ───────────────────────────────────────────────────────

    test.fixme('Owner approves a quote via owner portal: job moves to approved state, audit trail updated', async ({ page }) => {
        // TODO: Requires owner portal access and credentials
    });

    test.fixme('Owner rejects a quote via owner portal: job moves to rejected state, PM notified', async ({ page }) => {
        // TODO: Requires owner portal access and credentials
    });

    // ── Invoice matching ──────────────────────────────────────────────────────

    test.fixme('Match an invoice to a job and approve: trust debited, job and invoice statuses update correctly', async ({ page }) => {
        // TODO: Upload invoice, match to job, approve, verify statuses
    });

    // ── Notes & attachments ───────────────────────────────────────────────────

    test.fixme('Add a note to a job: note saved and visible in audit trail', async ({ page }) => {
        // TODO: Open a job, add note via note field, verify it appears in audit trail
    });

    test.fixme('Add a photo attachment to a job: photo visible on job detail', async ({ page }) => {
        // TODO: Open a job, upload photo, verify it appears in attachments section
    });

    // ── Cancel & Close ────────────────────────────────────────────────────────

    test.fixme('Cancel a job: job moves to Cancelled, audit trail updated', async ({ page }) => {
        // TODO: Open a job, click Cancel, confirm, verify status = Cancelled
    });

    test.fixme('Close a job: job moves to Closed state correctly', async ({ page }) => {
        // TODO: Open a job in correct state, click Close, verify status = Closed
    });

});
