import {test, expect} from '@playwright/test';
/*import {LoginPage} from '../pages/LoginPage';   // Import the LoginPage class       
import {DashboardPage} from '../pages/DashboardPage'; // Import the DashboardPage class 
*/

test('Assertions', async ({page}) => {
  await page.goto('https://staging.tapi.app/auth');
  await expect(page).toHaveURL('https://staging.tapi.app/auth');
  await expect(page).toHaveTitle('Tapi');
  const TapiLogo=await page.locator('.logo.new');
  expect(await TapiLogo.isVisible()).toBeTruthy();
  await page.locator('#session_email').click();
  await page.locator('#session_email').fill('josh@tapihq.com');
  await page.locator('#session_password').click();
  await page.locator('#session_password').fill('Josh123456');

  await page.locator("//button[normalize-space()='Log in']").click();
  await page.waitForSelector('text=Inbox');
  expect(await page.isVisible('text=Inbox')).toBeTruthy();

  /*await page.locator("//span[@class='button__content'][normalize-space()='Search']");
  expect(await page.isEnabled('text=Jobs')).toBeTruthy();
*/
  await page.locator("text=New Job").click();
  await page.locator("(//button[@type='button'])[3]").click();
  expect(await page.isEnabled("(//button[@type='button'])[3]")).toBeTruthy();
  await page.locator('[data-test="new-job-menu-link"]').click();
  await page.getByRole('button', { name: 'Tenant' }).click();
  await page.getByRole('button', { name: 'Select property' }).click();
  await page.getByRole('searchbox', { name: 'Search properties...' }).fill('test');
  await page.getByText('Test Road').click();
  await page.getByText('Notes Property note First').click();
  await page.getByRole('textbox', { name: 'Keep it short!' }).click();
  await page.getByRole('textbox', { name: 'Keep it short!' }).fill('Test 3'); // Job title
  await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').click();
  await page.locator('[data-test="new-job-description-field"]').getByRole('textbox').fill('test 3'); // Job description
  await page.getByRole('button', { name: 'Josh Sali' }).click();
  await page.locator('#content div').filter({ hasText: 'Source Inspection Tenant' }).nth(2).click();
  await page.locator('[data-test="new-job-submit-button"]').click();
  await page.locator('.responsive-holder__inner').click();

  

  });

  /*const links = await page.$$('a');

  for (const link of links) {
    const text = await link.textContent();
    console.log(text);
  }
    */
  //page.waitForSelector("//div[@class='table-wrapper page-table']//table//tbody//span/a");

  //  const jobs=await page.$$("//div[@class='table-wrapper page-table']//table//tbody//span/a");
  //  console.log(jobs.length);

 // for (const job of jobs) {
   // const text = await job.textContent();
    //console.log(text);
//}

  /*
  await page.getByRole('textbox', { name: 'Email:' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('josh@tapihq.com');
  await page.getByRole('textbox', { name: 'Password:' }).click();
  await page.getByRole('textbox', { name: 'Password:' }).fill('Josh123456');
  await page.getByRole('button', { name: 'Log in' }).click();
*/