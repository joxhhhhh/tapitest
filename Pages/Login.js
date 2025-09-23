exports.LoginPage = 
class LoginPage {
    constructor(page) {
        this.page = page;
    }

    async gotoLoginPage() {
        await this.page.goto('https://staging.tapi.app/jobs');
    }
    async login(email, Password) {
        await this.page.getByRole('textbox', { name: 'Email:' }).click();
        await this.page.getByRole('textbox', { name: 'Email:' }).fill('josh@tapihq.com');
        await this.page.getByRole('textbox', { name: 'Email:' }).press('Tab');
        await this.page.getByRole('textbox', { name: 'Password:' }).fill('Josh123456');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    








}