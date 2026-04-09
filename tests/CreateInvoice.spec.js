import { test, expect } from '@playwright/test';
import path from 'node:path';

const file = path.join(__dirname, 'uploadfiles', 'Invoice Sample.pdf');
const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
const password = process.env.TEST_PASSWORD || 'Tapi1234';

test('Create Invoice', async ({ page }) => {
    test.slow();

    await page.goto('https://dev.tapi.app/auth');
    await page.getByRole('textbox', { name: 'Email:' }).fill(email);
    await page.getByRole('textbox', { name: 'Email:' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password:' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.locator('[data-test="new-invoice-menu-link"]').click();
    await expect(page.getByRole('button', { name: 'Single' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batch' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator("//div[@class='uppy-dropzone']").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);

    await page.getByRole('button', { name: 'Select supplier' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('tapi test');
    await page.getByRole('option', { name: 'Tapi Test' }).click();
    await page.getByRole('button', { name: 'Select property' }).click();
    await page.getByRole('searchbox', { name: 'Search properties...' }).fill('11 d');
    await page.getByText('Dixon Street').click();
    await page.getByRole('button', { name: 'Select agent' }).click();
    await page.getByRole('option', { name: 'Josh Sali' }).locator('div').click();
    await page.locator('[data-test="invoice-upload-submit-button"]').click();
    await page.locator('[data-test="processing-invoice-process-button"]').click();

    await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Water bill' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Council rate' })).toBeVisible();
    await page.getByRole('button', { name: 'Water bill' }).click();
    await expect(page.getByRole('button', { name: 'Supplier & property' })).toBeVisible();

    await page.getByRole('button', { name: 'Tapi Test' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).click();
    await page.getByText('Job number Supplier & property Supplier Tapi Test Property 11 Dixon Street, Te').click();
    await expect(page.locator('[data-test="match-invoice-supplier-field"]').getByRole('button')).toContainText('Tapi Test');
    await expect(page.locator('[data-test="match-invoice-property-field"]').getByRole('button')).toContainText('11 Dixon Street, Te Aro, Wellington');
    await page.locator('.page-container').click();
    await page.locator('[data-test="match-invoice-attach-invoice-button"]').click();

    await page.locator('[data-test="confirm-invoice-description-field"]').getByRole('textbox').fill('Test Codegen - 1');
    await page.locator('[data-test="confirm-invoice-number-field"]').getByRole('textbox').fill('Mar12-codegen2');
    await page.locator('[data-test="confirm-invoice-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('12/03/2025');
    await page.locator('[data-test="confirm-invoice-due-date-field"]').getByRole('textbox', { name: 'DD/MM/YYYY' }).fill('31/03/2025');
    await page.locator('.page-container').click();
    await page.locator('[data-test="confirm-invoice-total-field"]').getByRole('textbox', { name: '0.00' }).fill('250');
    await page.getByText('Set to calculated tax from').click();
    await page.locator('label').filter({ hasText: 'Forward to owner for payment' }).locator('svg').click();
    await page.locator('label').filter({ hasText: 'Charge to property' }).locator('svg').click();
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).click();
    await expect(page.locator('[data-test="confirm-invoice-direct-debit-field"]')).toContainText('No property charge will be pushed to Palace when direct debit is selected.');
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).locator('use').click();
    await page.locator('label').filter({ hasText: 'Process as direct debit' }).locator('svg').click();

    await page.locator('[data-test="confirm-tenant-invoice-task"] use').first().click();
    await page.locator('.task__header-inner > .flex').first().click();
    await page.getByRole('button', { name: 'Select tenancy' }).click();
    await page.getByText('Snoop Dogg').click();
    await page.locator('[data-test="tenant-invoice-description-field"]').getByRole('textbox').fill('tenant 1 - snoop dogg');
    await page.locator('[data-test="tenant-invoice-total-field"]').getByRole('textbox', { name: '0.00' }).fill('100');
    await page.getByText('Set to calculated tax from').click();
    await page.getByRole('button', { name: 'Add tenant charge' }).click();
    await page.getByRole('button', { name: 'Select tenancy' }).click();
    await page.getByText('Snoop2 Dogg2 12/3/2025 - 31/7').click();
    await page.locator('textarea').nth(2).fill('tenant 2 - snoop 2 dogg2');
    await page.locator('[data-test="confirm-tenant-invoice-task"]').getByRole('textbox', { name: '0.00' }).nth(3).fill('150');
    await page.getByText('Set to calculated tax from').click();
    await page.locator('[data-test="send-notifications-task"] use').first().click();

    await expect(page.getByText('Invoice approved successfully')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoice has been approved' })).toBeVisible();
    await page.locator('[data-test="approved-invoice-task"] svg').first().click();
    await expect(page.getByRole('heading', { name: 'Owner notified' })).toBeVisible();

    await page.getByRole('link', { name: 'Invoices' }).click();
    await page.getByRole('link', { name: 'Mar12-codegen2' }).click();
    await expect(page.getByRole('heading', { name: 'Invoice has been approved' })).toBeVisible();

    await page.getByText('J Josh Sali').click();
    await page.getByRole('option', { name: 'Log out' }).click();
});
