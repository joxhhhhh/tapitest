import { test, expect } from '@playwright/test';
import path from 'node:path';
const file = path.join(__dirname, 'uploadfiles', 'Invoice1.png');
let testTitle= "Test 40";

test('codegenlogin', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://staging.tapi.app/auth');
  await page.getByRole('textbox', { name: 'Email:' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('josh@tapihq.com');
  await page.getByRole('textbox', { name: 'Email:' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password:' }).fill('Josh123456');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.locator('[data-test="new-job-menu-link"]').click();
  await page.getByRole('button', { name: 'Tenant' }).click();
  await page.getByRole('button', { name: 'Select property' }).click();
  await page.getByRole('searchbox', { name: 'Search properties...' }).fill('test');
  await page.getByText('Test Road').click();
  await page.getByText('Notes Property note First').click();
  await page.getByRole('textbox', { name: 'Keep it short!' }).click();

  await page.getByRole('textbox', { name: 'Keep it short!' }).fill(testTitle); // Job title
  await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').click();
  await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill(testTitle); // Job description
  await page.getByRole('button', { name: 'Josh Sali' }).click();
  await page.locator('[data-test="new-job-submit-button"]').click();
  /*page.on('dialog', async (dialog) => {
    console.log(dialog.message()).toContain('Job created successfully').tobetrue();
    expect(dialog.message()).toContain('Job created successfully').tobetrue();
    */
    //await pagetimeout(5000);
    await page.locator('.responsive-holder__inner').click();
    //await page.locator("//span[normalize-space()='Select files']").setInputFiles({
    //name: 'Invoice1.png',
    //buffer: Buffer.from('C:\\Users\\joshu\\Desktop\\playwright\\tests\\uploadfiles\\Invoice1.png', 'base64'),
    //mimeType: 'image/png', });
    
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Select files' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.getByRole('button', { name: 'Send work order' }).click();
    await page.getByRole('button', { name: 'Select supplier' }).click();
    await page.getByRole('searchbox', { name: 'Search suppliers' }).fill('test');
    await page.getByText('All is well plumbing test test').click();
    await page.locator('label').filter({ hasText: 'Do not require compliance' }).locator('svg').click();
    await page.getByRole('textbox', { name: '0.00' }).click();
    await page.getByRole('textbox', { name: '0.00' }).fill('100');
    await page.locator('[data-test="send-work-order-send-notifications-field"] svg').click();
    await page.locator('label').filter({ hasText: 'Send a copy of this work' }).click();
    await page.locator('[data-test="send-work-order-submit-button"]').click();
    await page.waitForTimeout(5000);  
    await page.getByRole('link', { name: 'Inbox' }).click();
    await page.waitForTimeout(5000); 
   // await page.locator("//span[normalize-space()='Reset']").click();
   // await page.waitForTimeout(10000); 
    await page.locator("(//span[@class='truncate'][normalize-space()=testTitle])[5]").getByRole('link').first().click();
    await expect(page).toHaveText(testTitle);
  }
  );  
  