exports.LoginPage =
class LoginPage {
    constructor(page) {
        this.page = page;
    }

    async gotoLoginPage() {
        await this.page.goto('/auth');
    }

    async login() {
        const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
        const password = process.env.TEST_PASSWORD || 'Josh123456';
        await this.page.getByRole('textbox', { name: 'Email:' }).fill(email);
        await this.page.getByRole('textbox', { name: 'Email:' }).press('Tab');
        await this.page.getByRole('textbox', { name: 'Password:' }).fill(password);
        await this.page.getByRole('button', { name: 'Log in' }).click();
        await this.page.waitForSelector('text=Inbox');
    }

    async logout() {
        await this.page.getByText('J Josh Sali').click();
        await this.page.getByRole('option', { name: 'Log out' }).click();
    }
}
