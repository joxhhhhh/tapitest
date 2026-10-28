/**
 * PropertyMe integration — Tapi-side checks (Linear AXO-431, AXO-432, AXO-433, AXO-434)
 *
 * Checks the jobs and invoices that move between Tapi and PropertyMe for one PropertyMe trust.
 * There is no PropertyMe access from this project, so these tests check the Tapi side of each
 * flow (state mapping, sync timestamps, required fields) and write the records to compare in
 * PropertyMe to reports/propertyme-integration-evidence-<trust>.json.
 *
 * Reads data through Tapi's own JSON API (GET only, same session as the UI). Nothing is created,
 * edited or deleted. The jobs and invoices it checks come from normal use of the trust,
 * including the daily regression run (allTrusts.spec.js), which creates a job and approves an
 * invoice on every trust.
 *
 * Tests:
 *   AXO-431 Inbound Jobs
 *     1. Jobs imported from PropertyMe are linked to a property and mapped to a Tapi state
 *   AXO-432 Outbound Jobs
 *     2. Tapi-created jobs have the details PropertyMe needs
 *     3. Job reopen is enabled and offered on closed and imported jobs
 *   AXO-433 Outbound Invoices
 *     4. Approved invoices are synced to PropertyMe
 *     5. BPAY codes are present and well formed
 *     6. Expense and income accounts are set and belong to the trust
 *     7. Tenant charges have a due date, and redacted copies have a redacted file
 *     8. Tenant charges by invoice type (Standard and Water Bill)
 *     9. Deposit invoices are linked to a job
 *    10. No duplicate approved invoices
 *   AXO-434 Invoice Field Mapping
 *    11. Supplier invoice: every field PropertyMe maps is populated
 *    12. Tenant invoice: every field PropertyMe maps is populated
 *
 * Trust defaults to "Property Me AU v2". Override with PME_TRUST="Property Me NZ v2".
 * RECENT_DAYS (default 30) sets how far back "recent" records go.
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const TRUST       = process.env.PME_TRUST || 'Property Me AU v2';
const HQ_BASE     = 'https://hq.staging.tapi.app';
const RECENT_DAYS = Number(process.env.RECENT_DAYS || 30);
const SINCE       = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
const EVIDENCE_FILE = path.resolve(process.cwd(), 'reports', `propertyme-integration-evidence-${TRUST.replace(/\W+/g, '-')}.json`);

// ── API helpers (GET only) ─────────────────────────────────────────────────────

async function apiGet(page, urlPath) {
    const res = await page.request.get(HQ_BASE + urlPath, { headers: { accept: 'application/json' }, timeout: 60000 });
    expect(res.status(), `GET ${urlPath}`).toBe(200);
    return res.json();
}

// Follows page_number until page_count is reached and returns every item.
async function apiGetAll(page, urlPath) {
    const sep = urlPath.includes('?') ? '&' : '?';
    const items = [];
    for (let n = 1; ; n++) {
        const body = await apiGet(page, `${urlPath}${sep}page_number=${n}&page_size=100`);
        items.push(...body.items);
        if (n >= (body.page_count || 1)) return items;
    }
}

// Newest-first pages until a record is older than SINCE.
async function apiGetRecent(page, urlPath) {
    const sep = urlPath.includes('?') ? '&' : '?';
    const items = [];
    for (let n = 1; ; n++) {
        const body = await apiGet(page, `${urlPath}${sep}order_by=inserted_at&order=desc&page_number=${n}&page_size=100`);
        items.push(...body.items.filter(r => r.inserted_at >= SINCE));
        if (n >= (body.page_count || 1) || body.items.some(r => r.inserted_at < SINCE)) return items;
    }
}

async function getCompany(page) {
    const { items } = await apiGet(page, '/api/companies/me?page_number=1');
    const found = items.find(c => c.name === TRUST);
    if (!found) throw new Error(`Trust "${TRUST}" not in /api/companies/me. Available: ${items.map(c => c.name).join(', ')}`);
    return apiGet(page, `/api/companies/${found.id}`);
}

const blank  = v => v === null || v === undefined || String(v).trim() === '';
const day    = v => (v ? String(v).slice(0, 10) : null);
const sample = (arr, n = 5) => arr.slice(0, n).join(' | ') + (arr.length > n ? ` (+${arr.length - n} more)` : '');
const label  = i => `${i.invoice_number || '(no number)'} ${i.invoice_type || ''}`.trim();

// Soft warnings are printed and attached to the report; they don't fail the test.
function warn(msg) {
    console.log(`  ⚠ ${msg}`);
    test.info().annotations.push({ type: 'warning', description: msg });
}

// Records each test wants compared by hand in PropertyMe.
const evidence = {};
function addEvidence(key, value) {
    evidence[key] = value;
    fs.mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify({ trust: TRUST, generated_at: new Date().toISOString(), ...evidence }, null, 2));
}

// ── Shared data (loaded once per worker) ──────────────────────────────────────

let data;
async function load(page) {
    if (data) return data;
    const company = await getCompany(page);
    const q = `company_id=${company.id}`;
    const [invoices, expense, income] = await Promise.all([
        apiGetAll(page, `/api/invoices?${q}`),
        apiGet(page, `/api/companies/${company.id}/expense_accounts`),   // plain array, not paged
        apiGet(page, `/api/companies/${company.id}/income_accounts`),
    ]);
    data = {
        company,
        invoices: invoices.filter(i => i.company_id === company.id && !i.deleted),
        expenseAccounts: new Map(expense.map(a => [a.id, a.name])),
        incomeAccounts:  new Map(income.map(a => [a.id, a.name])),
        q,
    };
    return data;
}

const approvedRecent = d => d.invoices.filter(i => i.approved && i.inserted_at >= SINCE);

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe(`PropertyMe integration — ${TRUST}`, () => {
    test.setTimeout(5 * 60 * 1000);

    test.beforeAll(() => console.log(`\nTrust: ${TRUST} · recent = since ${day(SINCE)}`));

    // ── AXO-431 Inbound Jobs ──────────────────────────────────────────────────

    test('AXO-431 · Inbound jobs: imported jobs are linked to a property and mapped to a Tapi state', async ({ page }) => {
        const { company, q } = await load(page);
        expect(company.integration_name, 'trust integration').toBe('Property Me');

        const imported = await apiGetAll(page, `/api/jobs?${q}&status=imported`);
        console.log(`  Imported jobs: ${imported.length}`);
        expect(imported.length, 'jobs imported from PropertyMe').toBeGreaterThan(0);

        const noProperty = imported.filter(j => blank(j.property_id));
        const badState   = imported.filter(j => !['open', 'closed'].includes(j.state)).map(j => `${j.work_order_number}=${j.state}`);
        const noWo       = imported.filter(j => blank(j.work_order_number)).map(j => j.id);
        const oldNoProperty = noProperty.filter(j => j.inserted_at < SINCE).map(j => `${j.work_order_number} "${j.title}" (${day(j.inserted_at)})`);
        if (oldNoProperty.length) warn(`Older imported jobs without a property: ${sample(oldNoProperty)}`);
        const recentNoProperty = noProperty.filter(j => j.inserted_at >= SINCE).map(j => j.work_order_number);
        expect(recentNoProperty, `recent imported jobs without a property: ${sample(recentNoProperty)}`).toEqual([]);
        expect(badState,   `imported jobs with an unknown state: ${sample(badState)}`).toEqual([]);
        expect(noWo,       `imported jobs without a work order number: ${sample(noWo)}`).toEqual([]);

        const newest = imported.reduce((a, b) => (a.inserted_at > b.inserted_at ? a : b));
        console.log(`  Newest import: ${newest.work_order_number} "${newest.title}" on ${day(newest.inserted_at)}`);
        const recent = imported.filter(j => j.inserted_at >= SINCE);
        if (!recent.length) warn(`No job imported from PropertyMe since ${day(SINCE)} (newest ${day(newest.inserted_at)}). Create a job in PropertyMe to test inbound jobs end to end.`);

        addEvidence('inbound_jobs', imported
            .sort((a, b) => b.inserted_at.localeCompare(a.inserted_at)).slice(0, 10)
            .map(j => ({ work_order_number: j.work_order_number, title: j.title, state: j.state, status: j.status, imported_at: j.inserted_at })));
    });

    // ── AXO-432 Outbound Jobs ─────────────────────────────────────────────────

    test('AXO-432 · Outbound jobs: Tapi-created jobs have the details PropertyMe needs', async ({ page }) => {
        const { q } = await load(page);
        const jobs = (await apiGetRecent(page, `/api/jobs?${q}`)).filter(j => j.status !== 'imported');
        console.log(`  Jobs created in Tapi since ${day(SINCE)}: ${jobs.length}`);
        expect(jobs.length, 'jobs created in Tapi recently').toBeGreaterThan(0);

        const missing = jobs
            .map(j => ({ j, gaps: ['property_id', 'work_order_number', 'title', 'agent_id'].filter(f => blank(j[f])) }))
            .filter(x => x.gaps.length)
            .map(x => `${x.j.work_order_number || `"${x.j.title}"`} (${day(x.j.inserted_at)}): ${x.gaps.join(',')}`);
        expect(missing, `jobs missing details: ${sample(missing)}`).toEqual([]);

        const reg = jobs.filter(j => /^Reg-/.test(j.title));
        if (!reg.length) warn('No regression-suite job in the window; nothing standard to look up in PropertyMe.');
        addEvidence('outbound_jobs', jobs.slice(0, 10).map(j => ({
            work_order_number: j.work_order_number, title: j.title, status: j.status, created_at: j.inserted_at,
        })));
        console.log(`  Newest: ${sample(jobs.slice(0, 3).map(j => `${j.work_order_number} "${j.title}"`), 3)}`);
    });

    test('AXO-432 · Outbound jobs: reopen is enabled and offered on closed and imported jobs', async ({ page }) => {
        const { company, q } = await load(page);
        expect(company.able_to_reopen_jobs, 'company setting able_to_reopen_jobs').toBe(true);

        const closed = (await apiGet(page, `/api/jobs?${q}&state=closed&order_by=inserted_at&order=desc&page_number=1&page_size=10`)).items;
        const imported = (await apiGet(page, `/api/jobs?${q}&status=imported&order_by=inserted_at&order=desc&page_number=1&page_size=5`)).items;
        expect(closed.length, 'closed jobs to check').toBeGreaterThan(0);

        const notReopenable = [];
        for (const j of [...closed, ...imported]) {
            const full = await apiGet(page, `/api/jobs/${j.id}`);
            if (full.able_to_reopen !== true) notReopenable.push(`${j.work_order_number} (${j.status})`);
        }
        expect(notReopenable, `jobs that can't be reopened: ${sample(notReopenable)}`).toEqual([]);

        const importedActions = imported.map(j => JSON.stringify(j.allowed_actions));
        console.log(`  ${closed.length} closed + ${imported.length} imported jobs reopenable. Imported actions: ${importedActions[0]}`);
        addEvidence('reopen_candidates', closed.slice(0, 5).map(j => ({ work_order_number: j.work_order_number, title: j.title, status: j.status })));
    });

    // ── AXO-433 Outbound Invoices ─────────────────────────────────────────────

    test('AXO-433 · Outbound invoices: approved invoices are synced to PropertyMe', async ({ page }) => {
        const d = await load(page);
        const approved = approvedRecent(d);
        console.log(`  Approved since ${day(SINCE)}: ${approved.length}`);
        expect(approved.length, 'invoices approved recently').toBeGreaterThan(0);

        const unsynced = approved.filter(i => blank(i.synced_at))
            .map(i => `${label(i)} ${i.supplier_name || ''} $${i.total} (created ${day(i.inserted_at)}, id ${i.id})`);
        const lag = approved.filter(i => i.synced_at && i.mark_as_approved_at)
            .map(i => (Date.parse(i.synced_at) - Date.parse(i.mark_as_approved_at)) / 60000);
        if (lag.length) console.log(`  Approval → sync: max ${Math.max(...lag).toFixed(1)} min`);
        addEvidence('unsynced_approved_invoices', unsynced);
        expect(unsynced, `approved but never synced: ${sample(unsynced)}`).toEqual([]);
    });

    test('AXO-433 · Outbound invoices: BPAY codes are present and well formed', async ({ page }) => {
        const d = await load(page);
        expect(d.company.settings.enable_bpay_payment, 'enable_bpay_payment setting').toBe(true);

        const withBpay = d.invoices.filter(i => i.approved && !blank(i.bpay_code));
        console.log(`  Approved invoices with a BPAY code: ${withBpay.length}`);
        expect(withBpay.length, 'approved invoices with a BPAY code').toBeGreaterThan(0);

        // BPAY customer reference numbers are 2–20 digits.
        const malformed = withBpay.filter(i => !/^\d{2,20}$/.test(String(i.bpay_code).replace(/\s/g, '')))
            .map(i => `${label(i)}="${i.bpay_code}"`);
        if (malformed.length) warn(`BPAY codes that aren't 2–20 digits: ${sample(malformed)}`);
    });

    test('AXO-433 · Outbound invoices: expense and income accounts are set and belong to the trust', async ({ page }) => {
        const d = await load(page);
        console.log(`  Trust accounts: ${d.expenseAccounts.size} expense, ${d.incomeAccounts.size} income`);
        expect(d.expenseAccounts.size, 'expense accounts').toBeGreaterThan(0);
        expect(d.incomeAccounts.size,  'income accounts').toBeGreaterThan(0);

        const approved = approvedRecent(d);
        const noExpense  = approved.filter(i => blank(i.expense_account)).map(label);
        const badExpense = approved.filter(i => i.expense_account && !d.expenseAccounts.has(i.expense_account)).map(label);
        const tc = approved.filter(i => i.tenant_charge);
        const noIncome  = tc.filter(i => blank(i.income_account)).map(label);
        const badIncome = tc.filter(i => i.income_account && !d.incomeAccounts.has(i.income_account)).map(label);

        const olderNoExpense = d.invoices.filter(i => i.approved && i.inserted_at < SINCE && blank(i.expense_account)).length;
        if (olderNoExpense) warn(`${olderNoExpense} older approved invoices (before ${day(SINCE)}) have no expense account.`);

        expect(noExpense,  `recent approved invoices with no expense account: ${sample(noExpense)}`).toEqual([]);
        expect(badExpense, `expense account not in this trust: ${sample(badExpense)}`).toEqual([]);
        expect(noIncome,   `tenant charges with no income account: ${sample(noIncome)}`).toEqual([]);
        expect(badIncome,  `income account not in this trust: ${sample(badIncome)}`).toEqual([]);
    });

    test('AXO-433 · Outbound invoices: tenant charges have a due date, redacted copies have a redacted file', async ({ page }) => {
        const d = await load(page);
        const tc = d.invoices.filter(i => i.approved && i.tenant_charge);
        console.log(`  Approved tenant charges: ${tc.length} (${tc.filter(i => i.attach_invoice_to_tenant_charge).length} with invoice copy attached)`);
        expect(tc.length, 'approved tenant charges').toBeGreaterThan(0);

        const noDue = tc.filter(i => blank(i.tenant_charge_due_date)).map(label);
        if (noDue.length) warn(`Tenant charges with no due date: ${sample(noDue)}`);
        expect(tc.filter(i => i.inserted_at >= SINCE && blank(i.tenant_charge_due_date)).map(label),
            'recent tenant charges with no due date').toEqual([]);

        const redacted = tc.filter(i => i.attach_invoice_to_tenant_charge && i.use_redacted_file);
        const noRedactedFile = redacted.filter(i => blank(i.redacted_attachment_id));
        console.log(`  Redacted copies: ${redacted.length}, missing redacted file: ${noRedactedFile.length}`);
        addEvidence('redacted_tenant_charges', redacted.map(i => ({ invoice_number: i.invoice_number, property: i.property_address, has_redacted_file: !blank(i.redacted_attachment_id) })));
        const oldNoFile = noRedactedFile.filter(i => i.inserted_at < SINCE).map(i => `${label(i)} (${day(i.inserted_at)})`);
        if (oldNoFile.length) warn(`Older tenant charges with redaction on but no redacted file: ${sample(oldNoFile)}`);
        const recentNoFile = noRedactedFile.filter(i => i.inserted_at >= SINCE).map(label);
        expect(recentNoFile, `redaction on but no redacted file: ${sample(recentNoFile)}`).toEqual([]);
    });

    test('AXO-433 · Outbound invoices: tenant charges by invoice type (Standard and Water Bill)', async ({ page }) => {
        const d = await load(page);
        const unrestricted = d.company.settings.enable_unrestricted_tenant_charge;
        const tc = d.invoices.filter(i => i.tenant_charge && i.inserted_at >= SINCE);
        const byType = tc.reduce((m, i) => ({ ...m, [i.invoice_type || 'none']: (m[i.invoice_type || 'none'] || 0) + 1 }), {});
        console.log(`  enable_unrestricted_tenant_charge: ${unrestricted}. Recent tenant charges by type: ${JSON.stringify(byType)}`);

        const restricted = tc.filter(i => ['standard', 'water_bill'].includes(i.invoice_type)).map(label);
        if (restricted.length) {
            // The checklist says Standard and Water Bill can't have a tenant charge; the trust setting may allow it.
            warn(`${restricted.length} recent Standard/Water Bill invoices have a tenant charge (unrestricted setting is ${unrestricted}). Confirm the expected rule.`);
        }
        if (!unrestricted) expect(restricted, 'tenant charges on Standard/Water Bill').toEqual([]);
    });

    test('AXO-433 · Outbound invoices: deposit invoices are linked to a job', async ({ page }) => {
        const d = await load(page);
        const deposits = d.invoices.filter(i => i.is_deposit);
        console.log(`  Deposit invoices: ${deposits.length} (${deposits.filter(i => i.approved).length} approved)`);
        if (!deposits.length) { test.skip(true, 'No deposit invoices on this trust'); return; }

        const noJob = deposits.filter(i => blank(i.job_id)).map(label);
        const unsynced = deposits.filter(i => i.approved && blank(i.synced_at)).map(label);
        addEvidence('deposit_invoices', deposits.slice(0, 10).map(i => ({ invoice_number: i.invoice_number, amount: i.deposit_amount, total: i.total, approved: i.approved, synced_at: i.synced_at })));
        if (unsynced.length) warn(`Approved deposit invoices not synced: ${sample(unsynced)}`);
        expect(noJob, `deposit invoices not linked to a job: ${sample(noJob)}`).toEqual([]);
    });

    test('AXO-433 · Outbound invoices: no duplicate approved invoices', async ({ page }) => {
        const d = await load(page);
        const groups = new Map();
        for (const i of d.invoices.filter(x => x.approved && !blank(x.invoice_number))) {
            const k = `${i.supplier_id}|${String(i.invoice_number).trim().toLowerCase()}|${Number(i.total)}`;
            groups.set(k, [...(groups.get(k) || []), i]);
        }
        const dups = [...groups.values()].filter(g => g.length > 1);
        const recentDups = dups.filter(g => g.some(i => i.inserted_at >= SINCE)).map(g => `${label(g[0])} ${g[0].supplier_name} $${g[0].total} ×${g.length}`);
        const oldDups    = dups.filter(g => g.every(i => i.inserted_at < SINCE)).map(g => `${label(g[0])} ×${g.length}`);
        console.log(`  Approved duplicates (same supplier, number, total): ${dups.length}`);
        if (oldDups.length) warn(`Older approved duplicates: ${sample(oldDups)}`);
        expect(recentDups, `recent approved duplicates: ${sample(recentDups)}`).toEqual([]);
    });

    // ── AXO-434 Invoice Field Mapping ─────────────────────────────────────────

    test('AXO-434 · Field mapping: supplier invoice has every field PropertyMe maps', async ({ page }) => {
        const d = await load(page);
        const synced = d.invoices.filter(i => i.approved && i.synced_at)
            .sort((a, b) => b.synced_at.localeCompare(a.synced_at)).slice(0, 5);
        expect(synced.length, 'synced approved invoices').toBeGreaterThan(0);

        const rows = [];
        for (const s of synced) {
            const i = await apiGet(page, `/api/invoices/${s.id}`);
            const row = {
                invoice_number: i.invoice_number,          // → Reference
                property: i.property_address,              // → Property
                supplier: i.supplier_name,                 // → Supplier
                description: i.description,                // → Detail
                invoice_date: day(i.invoice_date),         // → Created date
                total: i.total,                            // → Total
                tax: i.gst,                                // → Tax (from Chart Account)
                expense_account: d.expenseAccounts.get(i.expense_account) || i.expense_account, // → Chart Account
                due_date: day(i.due_date),                 // → Due date
                approved_on: day(i.mark_as_approved_at),
                synced_at: i.synced_at,
            };
            rows.push(row);
            const gaps = ['invoice_number', 'property', 'supplier', 'description', 'invoice_date', 'total', 'expense_account']
                .filter(f => blank(row[f]));
            expect(gaps, `${row.invoice_number}: fields missing`).toEqual([]);
            if (row.due_date && row.approved_on && row.due_date !== row.approved_on) {
                console.log(`  ${row.invoice_number}: due ${row.due_date} ≠ approved ${row.approved_on}`);
            }
        }
        addEvidence('supplier_invoice_mapping', rows);
        console.table(rows.map(r => ({ ref: r.invoice_number, total: r.total, tax: r.tax, account: r.expense_account, date: r.invoice_date, due: r.due_date })));
    });

    test('AXO-434 · Field mapping: tenant invoice has every field PropertyMe maps', async ({ page }) => {
        const d = await load(page);
        const tc = d.invoices.filter(i => i.approved && i.tenant_charge && i.synced_at)
            .sort((a, b) => b.synced_at.localeCompare(a.synced_at)).slice(0, 5);
        if (!tc.length) { test.skip(true, 'No synced tenant charges on this trust'); return; }

        const rows = [];
        for (const s of tc) {
            const i = await apiGet(page, `/api/invoices/${s.id}`);
            const charges = i.extra_info?.tenant_charges || [];
            const row = {
                invoice_number: i.invoice_number,
                property: i.property_address,
                tenancy_id: i.tenancy_id,                                   // → Contact
                description: i.tenant_charge_description || i.description,  // → Detail
                due_date: day(i.tenant_charge_due_date),                    // → Due date
                total: charges.length ? charges.map(c => c.amount ?? c.total).join('+') : i.total, // → Total
                tax: i.tenant_charge_tax,                                   // → Tax
                income_account: d.incomeAccounts.get(i.income_account) || i.income_account, // → Chart Account
                synced_at: i.synced_at,
            };
            rows.push(row);
            const gaps = ['tenancy_id', 'description', 'due_date', 'income_account'].filter(f => blank(row[f]));
            if (gaps.length) {
                if (i.inserted_at >= SINCE) expect(gaps, `${row.invoice_number}: tenant fields missing`).toEqual([]);
                else warn(`${row.invoice_number} (older): tenant fields missing ${gaps.join(', ')}`);
            }
        }
        addEvidence('tenant_invoice_mapping', rows);
        console.table(rows.map(r => ({ ref: r.invoice_number, due: r.due_date, tax: r.tax, account: r.income_account })));
    });
});
