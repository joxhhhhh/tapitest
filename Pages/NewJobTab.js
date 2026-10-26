import { expect } from '@playwright/test';

export class NewJob {
    constructor(page) {
        this.page = page;
        this.NewJobTab = "[data-test='new-job-menu-link']";
        this.SourceList = "//div/button/span[2]";
        this.SelectProperty = "//span[contains(text(),'Select property')]";
        this.SearchProperty = "//input[@placeholder='Search properties...']";
        this.TenancyButton = "span[class='dropdown-trigger'] span[class='button__content']";
        this.TenancyList = "//div[@role='option']";
        this.Title = "//input[@placeholder='Keep it short!']";
        this.Description = "//textarea[@class='input__control']";
        this.Assignto = "(//button[@type='button'])[10]";
        this.AssignToList = "//div[@role='option']";
        this.createJobButton = "[data-test='new-job-submit-button']";
        this.JobTitle = '//div/h1';
    }

    async createJob(source, property, tenancy, title, description, assignTo) {
        await this.page.click(this.NewJobTab);
        const SourceList = await this.page.$$(this.SourceList);
        for (const Source of SourceList) {
            if (source === await Source.innerText()) {
                await Source.click();
                break;
            }
        }
        await this.page.click(this.SelectProperty);
        await this.page.click(this.SearchProperty);
        await this.page.getByRole('searchbox', { name: 'Search properties...' }).fill(property);
        await this.page.getByText(property).first().click();
        // Only open the tenancy dropdown if tenancy selection is needed
        if (tenancy) {
            await this.page.click(this.TenancyButton);
            await this.page.waitForSelector(this.TenancyList, { timeout: 10000 });
            // Click the first available tenancy for the selected property
            await this.page.locator(this.TenancyList).first().click();
        }
        await this.page.fill(this.Title, title);
        await this.page.fill(this.Description, description);
        await this.page.click(this.Assignto);
        const AssignToList = await this.page.$$(this.AssignToList);
        for (const AssignTo of AssignToList) {
            if (assignTo === await AssignTo.innerText()) {
                await AssignTo.click();
                break;
            }
        }
        await this.page.click(this.createJobButton);
        await expect(this.page.locator(this.JobTitle)).toBeVisible();
        await this.page.screenshot({ path: 'tests/Screenshots/' + Date.now() + 'NewJobPage.png', fullPage: true });
        console.log('Job Title is: ', await this.page.locator(this.JobTitle).innerText());
    }
}
