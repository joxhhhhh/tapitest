import { test, expect } from '@playwright/test';

const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test('Assertions - login page and new job form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL('/auth');
    await expect(page).toHaveTitle('Tapi');
    await expect(page.locator('.logo.new')).toBeVisible();

    await page.locator('#session_email').fill(email);
    await page.locator('#session_password').fill(password);
    await page.locator("//button[normalize-space()='Log in']").click();

    await expect(page.getByText('Inbox')).toBeVisible();

    await page.locator('[data-test="new-job-menu-link"]').click();
    await page.getByRole('button', { name: 'Tenant' }).click();
    await expect(page.getByRole('button', { name: 'Tenant' })).toBeVisible();

    await page.getByRole('button', { name: 'Select property' }).click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('test');
    await page.getByText('Test Road').click();
    await page.getByText('Notes Property note First').click();
    await page.getByRole('textbox', { name: 'Keep it short!' }).fill('Test 3');
    await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill('test 3');
    await page.getByRole('button', { name: 'Josh Sali' }).click();
    await page.locator('[data-test="new-job-submit-button"]').click();

    await expect(page.locator('.responsive-holder__inner')).toBeVisible();
});
