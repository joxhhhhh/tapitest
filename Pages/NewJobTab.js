const { expect } = require('@playwright/test');

exports.NewJob =
class NewJob {
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
        await this.page.getByText(property).click();
        await this.page.click(this.TenancyButton);
        const TenancyList = await this.page.$$(this.TenancyList);
        for (const Tenancy of TenancyList) {
            if (tenancy === await Tenancy.innerText()) {
                await Tenancy.click();
                break;
            }
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
