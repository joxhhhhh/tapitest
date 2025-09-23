import { test, expect } from '@playwright/test';
import path from 'node:path';
const file = path.join(__dirname, 'uploadfiles', 'Invoice1.png');
let testTitle= "Test 45";
let page;

test.beforeEach(async ({ browser }) => { //login
  page = await browser.newPage();
  await page.goto('https://staging.tapi.app/auth');
  await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'LoginPage.png'});
  await page.getByRole('textbox', { name: 'Email:' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('josh@tapihq.com');
  await page.getByRole('textbox', { name: 'Email:' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password:' }).fill('Josh123456');
  await page.getByRole('button', { name: 'Log in' }).click();
  test.slow();
  await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'LandingPage.png'});
});

test.afterEach(async () => { //logout
  await page.getByText('J Josh Sali').click();
  await page.getByRole('option', { name: 'Log out' }).click();
});

test('Create New Job', async () => {
  
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
    await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'NewJobPopulatedPage.png', fullpage:true});
    await page.locator('[data-test="new-job-submit-button"]').click();
    await page.locator('.responsive-holder__inner').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Select files' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
    await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'UploadPhotoPage.png'});
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
    await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'SendWorkOrderPage.png', fullpage:true});
    await page.locator('[data-test="send-work-order-submit-button"]').click();
    await page.waitForTimeout(3000); 
    await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'SuccessMessage.png'});
    await page.getByRole('link', { name: 'Inbox' }).click();
    test.slow();
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Created: All time' }).click();
    await page.getByText('Today').click();
    test.slow();
    await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'GeneratedJobOrder.png', fullpage:true});
   // await page.getByText(''+testTitle).click();
    //test.slow();
   // await expect.locator('[data-test="job-title"]').toHaveText(testTitle);
    //test.slow();
    //await page.screenshot({path: 'tests/Screenshots/'+Date.now()+'CreatedJobOrder.png', fullpage:true});
  
  
  }); 

  
  