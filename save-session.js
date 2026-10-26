/**
 * Run this ONCE to save your login session for Playwright tests.
 *
 * Usage:
 *   node save-session.js
 *
 * How it works:
 *   1. Opens the base Tapi login page (staging.int.tapi.app/auth)
 *   2. You log in there — this sets the shared .tapi.app domain cookie
 *   3. The script then navigates to hq.staging.tapi.app to confirm it loads
 *   4. Saves the full session (cookies for both domains) to auth-session.json
 *
 * Re-run this script whenever tests fail with "App did not load".
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_AUTH = 'https://staging.int.tapi.app/auth';
const HQ_BASE   = 'https://hq.staging.tapi.app';
const INBOX     = `${HQ_BASE}/inbox/jobs?agent=59dd0536-4841-4bdb-b386-d9a77027e7f3`;
const SESSION_FILE = path.join(__dirname, 'auth-session.json');

function waitForEnter(prompt) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(prompt, () => { rl.close(); resolve(); });
    });
}

(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        // Basic Auth for the hq subdomain
        httpCredentials: { username: 'tapi', password: 'tapi' },
        viewport: null,
    });
    const page = await context.newPage();

    console.log('\n=== Tapi Session Setup ===\n');
    console.log('Step 1: Opening the base Tapi login page...');
    console.log(`        ${BASE_AUTH}\n`);

    await page.goto(BASE_AUTH, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    await waitForEnter('Log in to Tapi in the browser window, wait for the app to fully load, then press Enter here...\n');

    // Now navigate to HQ to get its cookies too
    console.log('\nStep 2: Navigating to hq.staging.tapi.app...');
    await page.goto(INBOX, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
        page.goto(INBOX, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
    );
    await page.waitForTimeout(2000);

    const title = await page.title().catch(() => '');
    if (title.toLowerCase().includes('tapi') || title.toLowerCase().includes('inbox')) {
        console.log(`✅ HQ loaded: "${title}"`);
    } else {
        console.log(`⚠️  HQ page title: "${title}" — if HQ looks blank, it may need a separate login.`);
        await waitForEnter('If a login prompt appeared in the browser, log in now, then press Enter...\n');
    }

    // Save cookies + sessionStorage + localStorage for both origins
    await context.storageState({ path: SESSION_FILE });
    console.log(`\n✅ Session saved to: ${SESSION_FILE}`);
    console.log('\nYou can now run the tests:');
    console.log('  npx playwright test tests/regression/allTrustsFunctional.spec.js --headed\n');

    await browser.close();
    process.exit(0);
})();
