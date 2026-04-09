import { test, expect } from '@playwright/test';

const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Josh123456';

test('login and verify Inbox', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel('Email:').fill(email);
    await page.getByLabel('Password:').fill(password);
    await page.getByText('Log in').click();

    await expect(page.getByText('Inbox')).toBeVisible();
    await expect(page).toHaveURL(/\/inbox\//);
});
