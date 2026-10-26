export class LoginPage {
    constructor(page) {
        this.page = page;
    }

    async gotoLoginPage() {
        await this.page.goto('/auth');
        await this.page.waitForSelector('input[type="email"]');
    }

    async login() {
        const email = process.env.TEST_EMAIL || 'josh@tapihq.com';
        const password = process.env.TEST_PASSWORD || 'Josh123456';
        await this.page.locator('input[type="email"]').fill(email);
        await this.page.locator('input[type="password"]').fill(password);
        await this.page.locator('input[type="password"]').press('Enter');
        await this.page.waitForSelector('text=Inbox', { timeout: 30000 });
    }

    async logout() {
        // Navigate to /logout; swallow all navigation errors so afterEach never fails the test
        await this.page.goto('/logout', { waitUntil: 'domcontentloaded' })
            .catch(() => this.page.goto('/auth', { waitUntil: 'domcontentloaded' })
                .catch(() => {}));
        await this.page.waitForSelector('input[type="email"]', { timeout: 10000 })
            .catch(() => {});
    }
}
