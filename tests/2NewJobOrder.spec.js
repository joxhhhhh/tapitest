import { test, expect } from '@playwright/test';
import path from 'node:path';

const file = path.join(__dirname, 'uploadfiles', 'Invoice1.png');
const testTitle = 'Test 45';
const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'LoginPage.png' });
    await page.getByRole('textbox', { name: 'Email:' }).fill(email);
    await page.getByRole('textbox', { name: 'Email:' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password:' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Inbox')).toBeVisible();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'LandingPage.png' });
});

test.afterEach(async ({ page }) => {
    await page.getByText('J Josh Sali').click();
    await page.getByRole('option', { name: 'Log out' }).click();
});

test('Create New Job', async ({ page }) => {
    test.slow();

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.getByRole('button', { name: 'Tenant' }).click();
    await page.getByRole('button', { name: 'Select property' }).click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('test');
    await page.getByText('Test Road').click();
    await page.getByText('Notes Property note First').click();
    await page.getByRole('textbox', { name: 'Keep it short!' }).fill(testTitle);
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(testTitle);
    await page.getByRole('button', { name: 'Josh Sali' }).click();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'NewJobPopulatedPage.png', fullPage: true });
    await page.locator('[data-test="new-job-submit-button"]').click();

    await page.locator('.responsive-holder__inner').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Select files' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'UploadPhotoPage.png' });
    await page.getByRole('button', { name: 'Upload' }).click();

    await page.getByRole('button', { name: 'Send work order' }).click();
    await page.getByRole('button', { name: 'Select supplier' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('test');
    await page.getByText('All is well plumbing test test').click();
    await page.locator('label').filter({ hasText: 'Do not require compliance' }).locator('svg').click();
    await page.getByRole('textbox', { name: '0.00' }).fill('100');
    await page.locator('[data-test="send-work-order-send-notifications-field"] svg').click();
    await page.locator('label').filter({ hasText: 'Send a copy of this work' }).click();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'SendWorkOrderPage.png', fullPage: true });
    await page.locator('[data-test="send-work-order-submit-button"]').click();

    await expect(page.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await page.getByRole('link', { name: 'Inbox' }).click();
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Created: All time' }).click();
    await page.getByText('Today').click();
    await expect(page.getByText(testTitle)).toBeVisible();
    await page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'GeneratedJobOrder.png', fullPage: true });
});
