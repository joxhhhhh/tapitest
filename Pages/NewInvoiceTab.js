import path from 'node:path';
const file = path.join(__dirname, 'uploadfiles', 'Invoice1.png');

exports.NewJob =
class NewInvoice {
    constructor(page) {
        this.page = page;
        //create new invoice locators
        this.NewInvoice = "(//span[normalize-space()='New invoice'])[1]";
        this.NewInvoiceTitle = "//h1[normalize-space()='New invoice']";
        this.SingleInvoice = "//button[normalize-space()='Single']"; //select single invoice
        this.BatchInvoice = "//button[normalize-space()='Batch']";  // select batch invoice
        this.BrowseFileButton = "//body[1]/div[2]/div[1]/div[2]/div[1]/div[2]/div[1]/div[2]/div[1]/div[2]/div[1]";
        this.selectSupplier = "//span[contains(text(),'Select supplier')]";
        this.selectSupplierSearch = "//input[@placeholder='Search suppliers']";
        this.selectProperty = "//span[contains(text(),'Select property')]";
        this.selectPropertySearch = "//input[@placeholder='Search properties...']";
        this.selectAgent = "//span[contains(text(),'Select agent')]";
        this.SelectAgentList = "//div[@class='listbox']//div";

        this.UploadButton = "//span[normalize-space()='Upload']";
        this.CancelButton = "//span[normalize-space()='Cancel']";

        //Detailed Invoice locators
        this.invoiceTitle = "//div/h1";
        this.processManually = "//button[@class='button button--secondary button--large']";
        this.invoiceType = "//div[@class='grid gap-2 align-stretch grid-cols-3']//button"; //Standard, Water bill, Council rate
        this.MatchBy = "//body/div[1]/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]/div[2]/div[2]/div[1]/div[1]/button"; //Job number or Supplier and Property
        
        //if Job number is selected
        this.JobNumber = "//input[@type='text']"; //fill in job number TAPI-XXXXXX
        this.JobSelect = "//div[@class='item item--default item--active item--clickable']"; 
        this.JobSelect2 = "div[class='item item--default item--clickable']";
        this.convertToQuote = "//span[normalize-space()='Convert to quote']";
        this.cancelConvertToQuote = "//span[normalize-space()='Cancel']";
        this.submitConvertToQuote = "//span[normalize-space()='Convert']";
        this.AttachInvoiceInJobNumber = "//span[normalize-space()='Attach invoice']";
        this.SuccessMessage = "//div[@class='app-notifications__inner']"; //Success message

        //If Supplier and Property is selected
        this.selectSupplier2 = "//span[contains(text(),'Select supplier')]";
        this.selectSupplierSearch2 = "//input[@placeholder='Search suppliers']";//Bee's Builders 1 or Tapi Test
        this.selectProperty2 = "//span[contains(text(),'Select property')]";
        this.selectPropertySearch2 = "//input[@placeholder='Search properties...']";//11 Dixon St, Hamilton, NSW
        this.processWithoutJob = "//span[@class='checkbox__content']"; //activate checkbox
        this.AttachInvoiceInSupplierAndProperty = "//span[normalize-space()='Attach invoice']";
        this.SuccessMessage = "//div[@class='app-notifications__inner']"; //Success message

        //Confirm Invoice Details
        this.InvoiceMatchedOptionClick = "//span[@class='icon icon--ellipsis-vertical-regular']//*[name()='svg']";
        this.InvoiceMatchedOptions = "/html[1]/body[1]/div[2]/div[1]/div[1]/div[1]/div[1]/a/div";  // View Job, View Supplier, View Property
        this.InvoiceMatchedUnmatched = "//div[contains(text(),'Unmatch')]";
        this.InvoiceDescription = "div[class='field mb-0'] textarea[class='input__control']"; // fill description
        this.InvoiceNumber = "div[class='field mb-0 field--error'] input[type='text']"; //fill invoice number
        this.InvoiceDate = "//div[@class='field mb-0 field--error']//span[@class='dropdown-trigger']//input"; //click date picker
        this.currentMonthandYear = "div[class='vc-title vc-text-lg vc-text-gray-800 vc-font-semibold hover:vc-opacity-75']"; //click or validate text 
        this.selectPreviousMonth = "//div[@class='vc-arrows-container title-center']//div[1]//*[name()='svg']"; //click previous month
        this.selectNextMonth = "//div[@class='vc-arrows-container title-center']//div[2]//*[name()='svg']"; //click next month

        
       

  


    }

    async createJob(source, property, tenancy, title, description, assignTo) {
        await page.locator('.responsive-holder__inner').click();
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: 'Select files' }).click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(file);
            await this.page.screenshot({path: 'tests/Screenshots/'+Date.now()+'UploadPhotoPage.png'});
            await this.page.getByRole('button', { name: 'Upload' }).click();
        

    
    }}

