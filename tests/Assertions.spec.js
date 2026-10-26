import { test, expect } from '@playwright/test';

const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test('Assertions - login page and new job form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL('/auth');
    await expect(page).toHaveTitle('Tapi');

    await page.waitForSelector('input[type="email"]');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').press('Enter');

    await page.waitForSelector('text=Inbox', { timeout: 30000 });

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.waitForSelector('[data-test="new-job-submit-button"]', { timeout: 15000 });
    await page.getByRole('button', { name: 'Tenant' }).first().click();
    await expect(page.getByRole('button', { name: 'Tenant' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Select property' }).first().click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('27 B');
    await page.waitForTimeout(500);
    await page.getByText('27 B').first().click(); // select first matching property
    // Tenancy: click the tenancy dropdown trigger then pick the first option
    await page.locator("span[class='dropdown-trigger'] span[class='button__content']").first().click();
    await page.waitForSelector("//div[@role='option']", { timeout: 10000 });
    await page.locator("//div[@role='option']").first().click();
    await page.getByRole('textbox', { name: 'Keep it short!' }).fill('Test 3');
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill('test 3');
    await page.getByRole('button', { name: 'Josh Sali' }).first().click();
    await page.locator('[data-test="new-job-submit-button"]').click();

    await expect(page.locator('.responsive-holder__inner')).toBeVisible();
});
