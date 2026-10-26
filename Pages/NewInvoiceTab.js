export class NewInvoice {
    constructor(page) {
        this.page = page;
        this.NewInvoiceLink = "[data-test='new-invoice-menu-link']";
        this.SingleInvoice = "//button[normalize-space()='Single']";
        this.BatchInvoice = "//button[normalize-space()='Batch']";
        this.UploadButton = "[data-test='invoice-upload-submit-button']";
        this.ProcessButton = "[data-test='processing-invoice-process-button']";
        this.AttachInvoiceButton = "[data-test='match-invoice-attach-invoice-button']";
        this.SubmitButton = "[data-test='confirm-invoice-submit-button']";
        this.SuccessMessage = ".app-notifications__inner";
    }

    async uploadInvoice(filePath, supplier, property, agent) {
        await this.page.click(this.NewInvoiceLink);
        // Wait for the invoice upload modal to appear — the file input is the most
        // reliable indicator; the XPath for 'Single' button is fragile if it has
        // icon children that alter the normalized text content.
        await this.page.waitForSelector('input[type="file"]', { timeout: 15000 });

        // Set file directly on the hidden input — more reliable than clicking the dropzone
        // and waiting for a file chooser event
        await this.page.locator('input[type="file"]').first().setInputFiles(filePath);

        // Select supplier
        await this.page.getByRole('button', { name: 'Select supplier' }).click();
        await this.page.getByRole('searchbox', { name: 'Search suppliers' }).fill(supplier);
        await this.page.waitForSelector('[role="option"]', { timeout: 10000 });
        await this.page.locator('[role="option"]').first().click();

        // Select property — in the invoice modal this is a proper dropdown so results use [role="option"]
        // (unlike the new job form where results are plain text elements)
        await this.page.getByRole('button', { name: 'Select property' }).click();
        await this.page.getByRole('searchbox', { name: 'Search properties...' }).fill(property);
        await this.page.waitForSelector('[role="option"]', { timeout: 10000 });
        await this.page.locator('[role="option"]').first().click();

        // Select agent — field is optional; skip gracefully if button is slow/absent
        try {
            await this.page.getByRole('button', { name: 'Select agent' }).click({ timeout: 5000 });
            await this.page.locator('[role="option"]').first().click({ timeout: 5000 });
        } catch (e) {
            // Agent field is optional — continue without selecting
        }

        await this.page.click(this.UploadButton);
    }
}
