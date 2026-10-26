import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'uploadfiles', 'Invoice1.png');
const testTitle = 'Test 45';
const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test.beforeEach(async ({ page }) => {
    test.setTimeout(90000); // slow() only applies after test body starts; set explicitly here
    await page.goto('/auth');
    await page.waitForSelector('input[type="email"]');
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'LoginPage.png' });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForSelector('text=Inbox', { timeout: 30000 });
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'LandingPage.png' });
});

test.afterEach(async ({ page }) => {
    // Use domcontentloaded to avoid ERR_ABORTED from open connections on the previous page
    await page.goto('/logout', { waitUntil: 'domcontentloaded' }).catch(() =>
        page.goto('/auth', { waitUntil: 'domcontentloaded' })
    );
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
});

test('Create New Job', async ({ page }) => {
    test.slow();

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.waitForSelector('[data-test="new-job-submit-button"]', { timeout: 15000 });
    await page.getByRole('button', { name: 'Tenant' }).first().click();
    await page.getByRole('button', { name: 'Select property' }).first().click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('27 B');
    await page.waitForTimeout(500);
    await page.getByText('27 B').first().click(); // select first matching property
    // Tenancy: click the tenancy dropdown trigger then pick the first option
    await page.locator("span[class='dropdown-trigger'] span[class='button__content']").first().click();
    await page.waitForSelector("//div[@role='option']", { timeout: 10000 });
    await page.locator("//div[@role='option']").first().click();
    await page.getByRole('textbox', { name: 'Keep it short!' }).fill(testTitle);
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(testTitle);
    await page.getByRole('button', { name: 'Josh Sali' }).first().click();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'NewJobPopulatedPage.png', fullPage: true });
    await page.locator('[data-test="new-job-submit-button"]').click();

    await page.locator('.responsive-holder__inner').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Select files' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'UploadPhotoPage.png' });
    await page.getByRole('button', { name: 'Upload' }).click();
    // Wait for file upload to complete and work order button to become available
    await page.waitForSelector('button:has-text("Send work order")', { timeout: 20000 });

    await page.getByRole('button', { name: 'Send work order' }).click();
    await page.getByRole('button', { name: 'Select supplier' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('josh');
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator('[role="option"]').first().click();
    // Toggle "Do not require compliance" — check the hidden checkbox inside the label
    try {
        await page.locator('label').filter({ hasText: 'Do not require compliance' })
            .locator('input[type="checkbox"]').check({ force: true, timeout: 10000 });
    } catch (e) {
        // no compliance toggle for this supplier — proceed anyway
    }
    await page.waitForTimeout(1500);
    // Quote amount — scoped to any send-work-order data-test, avoids compliance section inputs
    await page.locator('[data-test*="send-work-order"] input:not([type="checkbox"])').first().fill('100');
    await page.locator('[data-test="send-work-order-send-notifications-field"] svg').click();
    await page.locator('label').filter({ hasText: 'Send a copy of this work' }).click();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'SendWorkOrderPage.png', fullPage: true });
    await page.locator('[data-test="send-work-order-submit-button"]').click();

    await expect(page.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await page.getByRole('link', { name: 'Inbox' }).click();
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Created: All time' }).click();
    await page.getByText('Today').click();
    await expect(page.getByRole('link', { name: testTitle }).first()).toBeVisible();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'GeneratedJobOrder.png', fullPage: true });
});
