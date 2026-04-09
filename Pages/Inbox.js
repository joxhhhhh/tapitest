const { expect } = require('@playwright/test');

exports.Inbox =
class Inbox {
    constructor(page) {
        this.page = page;
        this.InboxTab = "//span[normalize-space()='Inbox']";
        this.JobList = '//div/table/tbody/tr/td/span/span/a/span[1]';
        this.JobTitle = '//div/h1';
    }

    async CheckJob(JobName) {
        await this.page.locator(this.InboxTab).click();
        await this.page.waitForSelector(this.JobList);
        await this.page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'Inbox.png', fullPage: true });
        const JobList = await this.page.$$(this.JobList);
        for (const Job of JobList) {
            if (JobName === await Job.innerText()) {
                await Job.click();
                console.log('Job Title is: ', await Job.innerText());
                await expect(this.page.locator(this.JobTitle)).toBeVisible();
                break;
            }
        }
    }
}
