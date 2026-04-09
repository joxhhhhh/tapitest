import path from 'node:path';

exports.NewInvoice =
class NewInvoice {
    constructor(page) {
        this.page = page;
        this.NewInvoiceLink = "[data-test='new-invoice-menu-link']";
        this.SingleInvoice = "//button[normalize-space()='Single']";
        this.BatchInvoice = "//button[normalize-space()='Batch']";
        this.DropZone = "//div[@class='uppy-dropzone']";
        this.selectSupplierBtn = "//span[contains(text(),'Select supplier')]";
        this.selectSupplierSearch = "//input[@placeholder='Search suppliers']";
        this.selectPropertyBtn = "//span[contains(text(),'Select property')]";
        this.selectPropertySearch = "//input[@placeholder='Search properties...']";
        this.selectAgentBtn = "//span[contains(text(),'Select agent')]";
        this.UploadButton = "[data-test='invoice-upload-submit-button']";
        this.ProcessButton = "[data-test='processing-invoice-process-button']";
        this.AttachInvoiceButton = "[data-test='match-invoice-attach-invoice-button']";
        this.SubmitButton = "[data-test='confirm-invoice-submit-button']";
        this.SuccessMessage = ".app-notifications__inner";
    }

    async uploadInvoice(filePath, supplier, property, agent) {
        await this.page.click(this.NewInvoiceLink);
        await this.page.waitForSelector(this.SingleInvoice);

        const fileChooserPromise = this.page.waitForEvent('filechooser');
        await this.page.locator(this.DropZone).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath);

        await this.page.click(this.selectSupplierBtn);
        await this.page.fill(this.selectSupplierSearch, supplier);
        await this.page.getByRole('option', { name: supplier }).click();

        await this.page.click(this.selectPropertyBtn);
        await this.page.fill(this.selectPropertySearch, property);
        await this.page.getByText(property).click();

        await this.page.click(this.selectAgentBtn);
        await this.page.getByRole('option', { name: agent }).locator('div').click();

        await this.page.click(this.UploadButton);
    }
}
