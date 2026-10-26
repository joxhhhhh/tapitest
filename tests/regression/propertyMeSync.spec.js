/**
 * PropertyMe Inbound Portfolio Sync — Tapi-side checks (Linear AXO-430)
 *
 * Checks the data PropertyMe has synced into Tapi for one PropertyMe trust.
 * There is no PropertyMe access from this project, so these tests check that the
 * synced data is present, complete, consistent and isolated. They do not compare
 * values field by field against PropertyMe.
 *
 * Reads data through Tapi's own JSON API (GET only, same session as the UI) and
 * cross-checks list totals in the UI. Nothing is created, edited or deleted.
 *
 * Tests:
 *   1. Properties: synced with address and status
 *   2. Tenancies: lease dates, tenant names and status
 *   3. Owners: name and contact details
 *   4. Suppliers: name, contact details and trade category
 *   5. Agents: synced and assignable
 *   6. Accounts: expense and income accounts pre-populated
 *   7. No duplicate records
 *   8. PM not re-assigned on matched properties (compares with the previous run's snapshot)
 *   9. Data isolated per trust account
 *
 * Trust defaults to "Property Me AU v2". Override with PME_TRUST="Property Me NZ v2".
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const TRUST   = process.env.PME_TRUST || 'Property Me AU v2';
const HQ_BASE = 'https://hq.staging.tapi.app';
const SNAPSHOT_FILE = path.resolve(process.cwd(), 'reports', `propertyme-sync-snapshot-${TRUST.replace(/\W+/g, '-')}.json`);

const SS = (page, label) =>
    page.screenshot({ path: `tests/Screenshots/${Date.now()}-pme-sync-${label}.png`, fullPage: true }).catch(() => {});

// Block Intercom so its marketing banners never cover the page.
async function blockIntercom(page) {
    await page.route(/intercom(cdn)?\.(io|com)/, route => route.abort());
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function login(page) {
    // Session is pre-loaded from auth-session.json via playwright.config.js storageState.
    await page.goto(`${HQ_BASE}/inbox/jobs`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() =>
        page.goto(`${HQ_BASE}/inbox/jobs`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    );
    const ok = await page.waitForSelector('text=Inbox', { timeout: 30000 }).then(() => true).catch(() => false);
    if (!ok) {
        await SS(page, 'login-failed');
        throw new Error('App did not load — run "node save-session.js" to refresh the saved session');
    }
}

async function switchTrust(page, trustName) {
    const trigger = page.locator('[data-name="app-company-dropdown"]');
    await trigger.click({ timeout: 10000 });
    await page.waitForTimeout(600);
    const popupId = await trigger.getAttribute('aria-controls').catch(() => null);
    const popup = popupId
        ? page.locator(`#${popupId}`)
        : page.locator('[role="listbox"], [role="menu"]').first();

    // Exact name only — "Property Me" alone matches more than one trust.
    const exactBtn = popup.getByRole('button', { name: trustName, exact: true });
    if (!(await exactBtn.isVisible({ timeout: 8000 }).catch(() => false))) {
        const available = (await popup.getByRole('button').allInnerTexts().catch(() => []))
            .map(t => t.trim()).filter(Boolean);
        throw new Error(`Trust "${trustName}" not found in trust switcher. Available: ${available.join(', ') || '(none read)'}`);
    }
    await exactBtn.click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('banner').getByRole('button', { name: trustName })).toBeVisible({ timeout: 15000 });
}

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
        if (n >= (body.page_count || 1)) return { items, total: body.total };
    }
}

async function getCompanies(page) {
    const { items } = await apiGet(page, '/api/companies/me?page_number=1');
    const company = items.find(c => c.name === TRUST);
    if (!company) throw new Error(`Trust "${TRUST}" not in /api/companies/me. Available: ${items.map(c => c.name).join(', ')}`);
    return { company, others: items.filter(c => c.id !== company.id) };
}

const blank = v => v === null || v === undefined || String(v).trim() === '';
const hasContact = r => !blank(r.email) || !blank(r.phone_mobile) || !blank(r.phone_work) || !blank(r.phone_home)
    || (r.contacts || []).some(c => !blank(c.email) || !blank(c.phone_mobile) || !blank(c.phone_work) || !blank(c.phone_home));
const isDate = v => !blank(v) && !Number.isNaN(Date.parse(v));
const norm = v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sample = (arr, n = 5) => arr.slice(0, n).join(' | ') + (arr.length > n ? ` (+${arr.length - n} more)` : '');

// Reads "Showing 25 of 136 properties" from a Manage list page.
async function uiTotal(page, urlPath, noun) {
    await page.goto(HQ_BASE + urlPath, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    const label = page.getByText(new RegExp(`Showing [\\d,]+ of [\\d,]+ ${noun}`, 'i')).first();
    await expect(label).toBeVisible({ timeout: 20000 });
    const text = await label.innerText();
    return Number(text.match(/of ([\d,]+)/i)[1].replace(/,/g, ''));
}

// Groups records by key and returns the groups with more than one record.
function duplicateGroups(records, keyFn) {
    const seen = new Map();
    for (const r of records) {
        const k = keyFn(r);
        if (!k) continue;
        seen.set(k, [...(seen.get(k) || []), r]);
    }
    return [...seen].filter(([, rs]) => rs.length > 1);
}

function duplicates(records, keyFn) {
    return duplicateGroups(records, keyFn).map(([k, rs]) => `${k} ×${rs.length}`);
}

// A duplicate whose newest record arrived in the last RECENT_DAYS was created by a recent sync,
// so it fails the test. Older duplicates are existing data and are only reported.
const RECENT_DAYS = 30;
function splitByAge(groups) {
    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    const newest = rs => Math.max(...rs.map(r => Date.parse(r.inserted_at) || 0));
    const label = ([k, rs]) => `${k} ×${rs.length} (newest ${new Date(newest(rs)).toISOString().slice(0, 10)})`;
    return {
        recent: groups.filter(([, rs]) => newest(rs) >= cutoff).map(label),
        old:    groups.filter(([, rs]) => newest(rs) <  cutoff).map(label),
    };
}

// Owners list as the Owners page loads it. Without order_by the API leaves out owners that have no email.
const ownersPath = companyId => `/api/owners?company_id=${companyId}&order_by=owner_name&order=asc`;

// ══════════════════════════════════════════════════════════════════════════════

test.describe(`PropertyMe sync — ${TRUST}`, () => {

    let company;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000);
        await blockIntercom(page);
        try {
            await login(page);
        } catch (e) {
            test.skip(true, `Login unavailable: ${e.message}`);
            return;
        }
        await switchTrust(page, TRUST);
        ({ company } = await getCompanies(page));
        expect(company.id).toBeTruthy();
    });

    // ── 1. Properties ─────────────────────────────────────────────────────────
    test('Properties: synced with address and status', async ({ page }) => {
        const { items: properties, total } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        console.log(`[pme-sync] ${properties.length} properties`);
        expect(properties.length, 'no properties synced').toBeGreaterThan(0);

        const noAddress = properties.filter(p => blank(p.address) || blank(p.street_name)).map(p => p.id);
        expect(noAddress, `properties without an address: ${sample(noAddress)}`).toEqual([]);

        const noStatus = properties.filter(p => typeof p.archived !== 'boolean' || typeof p.inactive !== 'boolean').map(p => p.address);
        expect(noStatus, `properties without archived/inactive status: ${sample(noStatus)}`).toEqual([]);

        const noLocality = properties.filter(p => blank(p.suburb) && blank(p.city)).map(p => p.address);
        if (noLocality.length) console.warn(`[pme-sync] ${noLocality.length} properties have no suburb or city: ${sample(noLocality)}`);

        const shown = await uiTotal(page, '/properties', 'properties');
        await SS(page, 'properties');
        expect(shown, 'Properties page total differs from API total').toBe(total);
    });

    // ── 2. Tenancies ──────────────────────────────────────────────────────────
    test('Tenancies: lease dates, tenant names and status', async ({ page }) => {
        const { items: properties } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        const problems = [];
        const inverted = [];
        const multipleActive = [];
        let tenancyCount = 0;
        let activeCount = 0;

        for (const p of properties.filter(x => !x.archived)) {
            const tenancies = await apiGet(page, `/api/properties/${p.id}/tenancies`);
            tenancyCount += tenancies.length;
            const active = tenancies.filter(t => t.active && !t.archived);
            activeCount += active.length;
            if (active.length > 1) multipleActive.push(`${p.address} (${active.length})`);

            for (const t of tenancies) {
                const where = `${p.address} tenancy ${t.id}`;
                if (t.property_id !== p.id) problems.push(`${where}: property_id ${t.property_id}`);
                if (typeof t.active !== 'boolean') problems.push(`${where}: no active status`);
                const start = t.lease_start_date || t.start_date;
                if (!isDate(start)) problems.push(`${where}: no valid start date`);
                const end = t.lease_end_date;
                if (!blank(end) && !isDate(end)) problems.push(`${where}: invalid lease end date "${end}"`);
                // Can't tell from Tapi alone whether PropertyMe holds the same dates, so this is a warning.
                if (isDate(start) && isDate(end) && Date.parse(end) < Date.parse(start)) {
                    inverted.push(`${where}: lease ends before it starts (${start.slice(0, 10)} → ${end.slice(0, 10)})`);
                }
                if (t.active && !(t.tenants || []).length) problems.push(`${where}: active tenancy has no tenants`);
                for (const tn of t.tenants || []) {
                    if (blank(tn.full_name) && blank(tn.first_name) && blank(tn.last_name)) problems.push(`${where}: tenant ${tn.id} has no name`);
                }
            }
        }

        console.log(`[pme-sync] ${tenancyCount} tenancies (${activeCount} active) across ${properties.length} properties`);
        if (multipleActive.length) console.warn(`[pme-sync] properties with more than one active tenancy: ${sample(multipleActive)}`);
        if (inverted.length) console.warn(`[pme-sync] ${inverted.length} tenancies end before they start — compare with PropertyMe: ${sample(inverted)}`);
        expect(tenancyCount, 'no tenancies synced').toBeGreaterThan(0);
        expect(problems, sample(problems, 10)).toEqual([]);
    });

    // ── 3. Owners ─────────────────────────────────────────────────────────────
    test('Owners: name and contact details', async ({ page }) => {
        const { items: owners, total } = await apiGetAll(page, ownersPath(company.id));
        const { items: properties } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        console.log(`[pme-sync] ${owners.length} owners`);
        expect(owners.length, 'no owners synced').toBeGreaterThan(0);

        const { total: unorderedTotal } = await apiGet(page, `/api/owners?company_id=${company.id}&page_number=1`);
        if (unorderedTotal !== total) {
            console.warn(`[pme-sync] /api/owners returns ${unorderedTotal} owners without order_by but ${total} with it — owners with no email are left out of the unordered list`);
        }

        const noName = owners.filter(o => blank(o.full_name) && blank(o.first_name) && blank(o.last_name)).map(o => o.id);
        expect(noName, `owners without a name: ${sample(noName)}`).toEqual([]);

        const noContact = owners.filter(o => !hasContact(o)).map(o => o.full_name);
        if (noContact.length) console.warn(`[pme-sync] ${noContact.length} owners have no email or phone: ${sample(noContact)}`);

        // Every owner a property points to must have synced too.
        const ownerIds = new Set(owners.map(o => o.id));
        const orphaned = properties.filter(p => p.owner_id && !ownerIds.has(p.owner_id))
            .map(p => `${p.address} → owner ${p.owner_id}`);
        if (orphaned.length) {
            // The owner may be archived and so missing from the default list — look each one up before failing.
            const missing = [];
            for (const line of orphaned) {
                const id = line.split('owner ')[1];
                const res = await page.request.get(`${HQ_BASE}/api/owners/${id}`, { headers: { accept: 'application/json' } });
                if (res.status() !== 200) missing.push(line);
            }
            expect(missing, `properties whose owner did not sync: ${sample(missing)}`).toEqual([]);
        }

        const shown = await uiTotal(page, '/owners', 'owners');
        await SS(page, 'owners');
        expect(shown, 'Owners page total differs from API total').toBe(total);
    });

    // ── 4. Suppliers ──────────────────────────────────────────────────────────
    test('Suppliers: name, contact details and trade category', async ({ page }) => {
        const { items: suppliers, total } = await apiGetAll(page, `/api/suppliers?company_id=${company.id}`);
        console.log(`[pme-sync] ${suppliers.length} suppliers`);
        expect(suppliers.length, 'no suppliers synced').toBeGreaterThan(0);

        const noName = suppliers.filter(s => blank(s.company_name) && blank(s.full_name)).map(s => s.id);
        expect(noName, `suppliers without a name: ${sample(noName)}`).toEqual([]);

        const noContact = suppliers.filter(s => !hasContact(s)).map(s => s.company_name || s.full_name);
        if (noContact.length) console.warn(`[pme-sync] ${noContact.length} suppliers have no email or phone: ${sample(noContact)}`);

        // Trade category: the field name is not documented, so look for any trade/category/service field.
        const tradeKey = Object.keys(suppliers[0]).find(k => /trade|categor|service_type|specialt/i.test(k));
        if (!tradeKey) {
            console.warn('[pme-sync] Supplier trade category is not exposed by /api/suppliers — check it manually');
        } else {
            const noTrade = suppliers.filter(s => blank(s[tradeKey]) || (Array.isArray(s[tradeKey]) && !s[tradeKey].length))
                .map(s => s.company_name || s.full_name);
            if (noTrade.length) console.warn(`[pme-sync] ${noTrade.length} suppliers have no ${tradeKey}: ${sample(noTrade)}`);
        }

        const shown = await uiTotal(page, '/suppliers', 'suppliers');
        await SS(page, 'suppliers');
        expect(shown, 'Suppliers page total differs from API total').toBe(total);
    });

    // ── 5. Agents ─────────────────────────────────────────────────────────────
    test('Agents: synced and assignable', async ({ page }) => {
        const { items: agents } = await apiGetAll(page, `/api/agents?company_id=${company.id}`);
        const active = agents.filter(a => a.active && !a.archived);
        console.log(`[pme-sync] ${agents.length} agents (${active.length} active)`);
        expect(active.length, 'no active agents').toBeGreaterThan(0);

        const noName = agents.filter(a => blank(a.full_name)).map(a => a.id);
        expect(noName, `agents without a name: ${sample(noName)}`).toEqual([]);
        const wrongCompany = agents.filter(a => a.company_id !== company.id).map(a => a.full_name);
        expect(wrongCompany, `agents from another company: ${sample(wrongCompany)}`).toEqual([]);

        // Every property's PM must be a known agent in this trust.
        const { items: properties } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        const byId = new Map(agents.map(a => [a.id, a]));
        const unknown = properties.filter(p => p.agent_id && !byId.has(p.agent_id)).map(p => `${p.address} → ${p.agent_full_name || p.agent_id}`);
        expect(unknown, `properties assigned to an agent not in this trust: ${sample(unknown)}`).toEqual([]);
        const inactivePm = properties.filter(p => p.agent_id && byId.get(p.agent_id) && !byId.get(p.agent_id).active)
            .map(p => `${p.address} → ${p.agent_full_name}`);
        if (inactivePm.length) console.warn(`[pme-sync] ${inactivePm.length} properties are assigned to an inactive agent: ${sample(inactivePm)}`);
        const unassigned = properties.filter(p => !p.agent_id).map(p => p.address);
        if (unassigned.length) console.warn(`[pme-sync] ${unassigned.length} properties have no agent: ${sample(unassigned)}`);

        // Assignable: active agents are offered in the Agent picker on the Properties page.
        await page.goto(`${HQ_BASE}/properties`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
        await page.getByRole('button', { name: /^Agent$/ }).first().click({ timeout: 10000 });
        await page.waitForTimeout(800);
        await SS(page, 'agent-picker');
        const name = active.find(a => a.property_count > 0)?.full_name || active[0].full_name;
        await expect(page.getByText(name, { exact: true }).last()).toBeVisible({ timeout: 10000 });
        await page.keyboard.press('Escape');
    });

    // ── 6. Accounts ───────────────────────────────────────────────────────────
    test('Accounts: expense and income accounts pre-populated', async ({ page }) => {
        for (const kind of ['expense', 'income']) {
            const accounts = await apiGet(page, `/api/companies/${company.id}/${kind}_accounts`);
            console.log(`[pme-sync] ${accounts.length} ${kind} accounts`);
            expect(accounts.length, `no ${kind} accounts synced`).toBeGreaterThan(0);

            const noName = accounts.filter(a => blank(a.name) || blank(a.id)).map(a => JSON.stringify(a));
            expect(noName, `${kind} accounts without a name: ${sample(noName)}`).toEqual([]);
            expect(duplicates(accounts, a => a.id), `duplicate ${kind} account ids`).toEqual([]);

            const dupNames = duplicates(accounts, a => norm(a.name));
            if (dupNames.length) console.warn(`[pme-sync] duplicate ${kind} account names: ${sample(dupNames)}`);
            const unusual = accounts.filter(a => !/^\d+\s*-\s*\S/.test(a.name)).map(a => a.name);
            if (unusual.length) console.warn(`[pme-sync] ${kind} accounts not in "code - name" form: ${sample(unusual)}`);
        }
    });

    // ── 7. Duplicates ─────────────────────────────────────────────────────────
    test('No duplicate records', async ({ page }) => {
        const { items: properties } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        const { items: owners }     = await apiGetAll(page, ownersPath(company.id));
        const { items: suppliers }  = await apiGetAll(page, `/api/suppliers?company_id=${company.id}`);
        const { items: agents }     = await apiGetAll(page, `/api/agents?company_id=${company.id}`);

        for (const [label, list] of [['property', properties], ['owner', owners], ['supplier', suppliers], ['agent', agents]]) {
            expect(duplicates(list, r => r.id), `duplicate ${label} ids`).toEqual([]);
        }

        // Same address, or same name + email + phone, is the same record synced twice.
        const addressKey = p => norm([p.unit, p.street_number, p.street_name, p.suburb || p.city].join(' '));
        const contactKey = r => norm([r.full_name || r.company_name, r.email, r.phone_mobile || r.phone_work || r.phone_home].join(' '));
        for (const [label, list, keyFn] of [
            ['property addresses', properties, addressKey],
            ['owners', owners, contactKey],
            ['suppliers', suppliers, contactKey],
        ]) {
            const { recent, old } = splitByAge(duplicateGroups(list.filter(r => !r.archived), keyFn));
            if (old.length) console.warn(`[pme-sync] existing duplicate ${label} (older than ${RECENT_DAYS} days): ${sample(old, 10)}`);
            expect(recent, `duplicate ${label} created in the last ${RECENT_DAYS} days: ${sample(recent, 10)}`).toEqual([]);
        }

        // Same name only is worth a look but can be legitimate (two people called John Smith).
        const sameNameOwners = duplicates(owners.filter(o => !o.archived), o => norm(o.full_name));
        if (sameNameOwners.length) console.warn(`[pme-sync] owners sharing a name: ${sample(sameNameOwners)}`);
        const sameNameSuppliers = duplicates(suppliers.filter(s => !s.archived), s => norm(s.company_name || s.full_name));
        if (sameNameSuppliers.length) console.warn(`[pme-sync] suppliers sharing a name: ${sample(sameNameSuppliers)}`);
    });

    // ── 8. PM not re-assigned ─────────────────────────────────────────────────
    // There is no "sync now" control in Tapi; PropertyMe syncs on a schedule. So this compares
    // each property's PM with the snapshot saved by the previous run, then saves a new snapshot.
    // A change can be legitimate (PM changed in PropertyMe), so it is reported as a warning.
    test('PM not re-assigned on matched properties', async ({ page }) => {
        const { items: properties } = await apiGetAll(page, `/api/properties?company_id=${company.id}`);
        const current = Object.fromEntries(properties.map(p => [p.id, {
            address: p.address, agent_id: p.agent_id, agent: p.agent_full_name, updated_at: p.updated_at,
        }]));

        let previous = null;
        try { previous = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')); } catch { /* first run */ }

        if (!previous) {
            console.log(`[pme-sync] No previous snapshot — saved a baseline of ${properties.length} properties. The PM check starts from the next run.`);
        } else {
            const changed = Object.entries(previous.properties)
                .filter(([id, before]) => current[id] && current[id].agent_id !== before.agent_id)
                .map(([id, before]) => `${before.address}: ${before.agent} → ${current[id].agent}`);
            const removed = Object.keys(previous.properties).filter(id => !current[id]).length;
            const added = Object.keys(current).filter(id => !previous.properties[id]).length;
            console.log(`[pme-sync] Since ${previous.taken_at}: ${added} properties added, ${removed} removed, ${changed.length} PM changes`);
            if (changed.length) {
                console.warn(`[pme-sync] PM changed on ${changed.length} properties since ${previous.taken_at} — confirm in PropertyMe whether these were changed there: ${sample(changed, 10)}`);
            }
        }

        fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ trust: TRUST, taken_at: new Date().toISOString(), properties: current }, null, 2));
    });

    // ── 9. Data isolation ─────────────────────────────────────────────────────
    test('Data is isolated per trust account', async ({ page }) => {
        const { others } = await getCompanies(page);
        const sets = {};
        const listPath = (kind, id) => kind === 'owners' ? ownersPath(id) : `/api/${kind}?company_id=${id}`;
        for (const kind of ['properties', 'owners', 'suppliers']) {
            const { items } = await apiGetAll(page, listPath(kind, company.id));
            const wrong = items.filter(r => r.company_id !== company.id).map(r => r.address || r.full_name || r.company_name || r.id);
            expect(wrong, `${kind} returned for ${TRUST} that belong to another company: ${sample(wrong)}`).toEqual([]);
            sets[kind] = new Set(items.map(r => r.id));
        }

        // The same record id must never appear under another trust.
        for (const other of others) {
            for (const kind of ['properties', 'owners', 'suppliers']) {
                const { items } = await apiGetAll(page, listPath(kind, other.id));
                const shared = items.filter(r => sets[kind].has(r.id)).map(r => r.address || r.full_name || r.company_name || r.id);
                expect(shared, `${kind} shared between ${TRUST} and ${other.name}: ${sample(shared)}`).toEqual([]);
                const leaked = items.filter(r => r.company_id && r.company_id !== other.id).length;
                expect(leaked, `${other.name} ${kind} list contains records from another company`).toBe(0);
            }
        }
        console.log(`[pme-sync] Isolation checked against ${others.length} other trusts: ${others.map(o => o.name).join(', ')}`);
    });

});
