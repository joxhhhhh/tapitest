import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/Login.js';

test('login and verify Inbox', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login();

    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible({ timeout: 15000 });
});
