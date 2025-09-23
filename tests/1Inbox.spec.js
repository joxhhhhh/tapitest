import {test,expect} from '@playwright/test';

test('login',async ({page}) => {

    await page.goto('https://staging.tapi.app/auth');
    await page.getByLabel('Email:').fill('josh@tapihq.com');
    await page.getByLabel('Password:').fill('Josh123456');
    await page.getByText('Log in').click();
    await page.waitForSelector('text=Inbox');
    //await expect(page.tohaveTitle('Inbox'));
    expect(await page.isVisible('text=Inbox')).toBeTruthy();   
   // await expect(page.url()).toBe('https://staging.tapi.app/auth');
    //await page.click('text=Logout');
   // await page.waitForSelector('text=Login'); 
    await expect(page.url()).toBe('https://staging.tapi.app/inbox/jobs?agent=cbf067b0-a8a6-4975-b8ef-f7ca5dd6a6b7');
    await page.waitForSelector('text=Inbox');
    expect(await page.isVisible('text=Inbox')).toBeTruthy();
}
)
/*
test ('Locators', async ({page}) => {
    await page.goto('https://staging.tapi.app/auth'); 
    await page.getByLabel('Email:').fill('josh@tapihq.com');
    await page.getByLabel('Password:').fill('Josh123456');
    await page.getByText('Log in').click();
    await page.waitForSelector('text=Inbox');
    expect(await page.isVisible('text=Inbox')).toBeTruthy();

    await page.locator('text=Take action').click();
    await page.waitForSelector('text=Take action');
    expect(await page.isVisible('text=Take action')).toBeTruthy();
    await page.locator('text=Open').click();
    await page.waitForSelector('text=Open jobs, Awaiting quotes, Awaiting approval, Scheduling job, Awaiting repair, Awaiting confirmation, Awaiting invoice');
    expect(await page.isVisible('text=Open jobs, Awaiting quotes, Awaiting approval, Scheduling job, Awaiting repair, Awaiting confirmation, Awaiting invoice')).toBeTruthy();

   
    // page.close();   

}
)
*/