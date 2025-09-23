exports.NewJob =
class NewJob {
    constructor(page) {
        this.page = page;
        this.TabNames = "//div/a/span[2]"; //does not include database and account tabs
        this.NewJobTab = "[data-test='new-job-menu-link']";
        this.SourceList = "//div/button/span[2]"; //includes search box
        this.SelectProperty = "//span[contains(text(),'Select property')]";
        this.SearchProperty = "//input[@placeholder='Search properties...']"; //can input property e.g. 11 Dixon St, Wellington, Wellington
        this.TenancyButton = "span[class='dropdown-trigger'] span[class='button__content']"; 
        this.TenancyList = "//div[@role='option']"
        this.Title = "//input[@placeholder='Keep it short!']"; //fill in job title
        this.Description = "//textarea[@class='input__control']"; //fill in job description
        this.Assignto = "(//button[@type='button'])[10]"; //includes search box
        this.AssignToList = "//div[@role='option']";
        this.createJobButton = "[data-test='new-job-submit-button']";
        this.MajorButtonsList = "//button[@type='button' and span[2]]";
        this.JobTitle = '//div/h1';
        this.InboxTab = "//span[normalize-space()='Inbox']";
    }

    async createJob(source, property, tenancy, title, description, assignTo) {
        await this.page.click(this.NewJobTab); //click on new job tab
        const SourceList = await this.page.$$(this.SourceList); //get list of sources
        for (const Source of SourceList) {
            if (source === await Source.innerText()) {
                await Source.click();
                break;
            }}
        await this.page.click(this.SelectProperty); //click on select property button
        await this.page.click(this.SearchProperty); //click on search property button
        await this.page.getByRole('searchbox', { name: 'Search properties...' }).fill(property); //fill in property
        await this.page.getByText(property).click();
        await this.page.click(this.TenancyButton); //click on tenancy button
        const TenancyList = await this.page.$$(this.TenancyList); //get list of tenancies
        for (const Tenancy of TenancyList) {
            if (tenancy === await Tenancy.innerText()) {
                await Tenancy.click();
                break;
            }}
        await this.page.click(this.Title); //click on title
        await this.page.fill(this.Title, title); //fill in title
        await this.page.click(this.Description); //click on description
        await this.page.fill(this.Description, description); //fill in description
        await this.page.click(this.Assignto); //click on assign to button
        const AssignToList = await this.page.$$(this.AssignToList); //get list of assign to
        for (const AssignTo of AssignToList) {
            if (assignTo === await AssignTo.innerText()) {
                await AssignTo.click();
                break;
            }}
        await this.page.click(this.createJobButton); //click on create job button
        await this.page.waitForTimeout(5000);   
        await this.page.screenshot({path: 'tests/Screenshots/'+Date.now()+'NewJobPage.png', fullpage:true});
        console.log("Job Title is: ", await this.page.locator(this.JobTitle).innerText());

    
    
    
    }}

