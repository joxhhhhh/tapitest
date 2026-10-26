import { test, expect } from '@playwright/test';
import { LoginPage } from '../Pages/Login.js';
import { Inbox } from '../Pages/Inbox.js';
import { NewJob } from '../Pages/NewJobTab.js';

const jobName = 'Sink not working';
const source = 'Tenant';
const property = '27 B';
const tenancy = '';
const assignTo = 'Josh Sali';

test('End to End - Create Job and verify in Inbox', async ({ page }) => {
    test.slow();

    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login();

    const newJob = new NewJob(page);
    await newJob.createJob(source, property, tenancy, jobName, jobName, assignTo);

    const inbox = new Inbox(page);
    await inbox.CheckJob(jobName);

    await loginPage.logout();
});
