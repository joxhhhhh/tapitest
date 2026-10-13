/**
 * Functional Test Report Generator
 * Reads playwright-report/results.json and generates a Word doc.
 *
 * Usage:
 *   npx playwright test tests/regression/allTrustsFunctional.spec.js --reporter=json,html
 *   node functional-report.js
 */

const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
    VerticalAlign
} = require('docx');
const fs = require('fs');

// ── Load results ──────────────────────────────────────────────────────────────
let rawResults;
try {
    rawResults = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
} catch {
    try {
        rawResults = JSON.parse(fs.readFileSync('playwright-report/results.json', 'utf8'));
    } catch {
        console.error('No results.json found. Run: npx playwright test --reporter=json,html 2>&1 | tee test-results.json');
        process.exit(1);
    }
}

const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Parse results ─────────────────────────────────────────────────────────────
const TESTS = [
    'Job: Edit fields',
    'Job: Cancel a job',
    'Job: Close a job',
    'Job: Add a note',
    'Invoice: Delete',
    'Settings: Business settings',
    'Settings: User list',
];

const TRUSTS = [
    'ABC Reapit UK', 'ABC SME UK', 'ABC Street UK', 'ABC PropertyTree',
    'ABC Liquid NZ', 'ABC Alto UK', 'ABC PropertyMe Prismatic',
    'ABC IAMP UK', 'ABC Console Big Company', 'Property Me NZ v2',
];

// Build a results map: trust → testShortName → status
const resultsMap = {};
TRUSTS.forEach(t => { resultsMap[t] = {}; });

function flattenSuites(suites) {
    const out = [];
    for (const s of suites || []) {
        for (const spec of s.specs || []) {
            out.push({ title: spec.title, status: spec.tests?.[0]?.results?.[0]?.status ?? 'unknown', suite: s.title });
        }
        out.push(...flattenSuites(s.suites));
    }
    return out;
}

const allSpecs = flattenSuites(rawResults.suites || []);

for (const spec of allSpecs) {
    // Match trust name from suite title like "Functional — ABC Reapit UK"
    for (const trust of TRUSTS) {
        if (spec.suite && spec.suite.includes(trust)) {
            // Match test name
            for (const t of TESTS) {
                if (spec.title.toLowerCase().includes(t.split(':')[1].trim().toLowerCase().split(' ').slice(0, 3).join(' '))) {
                    const s = spec.status === 'passed' ? 'PASSED'
                        : spec.status === 'skipped' ? 'SKIPPED'
                        : 'FAILED';
                    resultsMap[trust][t] = s;
                }
            }
        }
    }
}

// ── Colours ───────────────────────────────────────────────────────────────────
const TEAL   = '0A7C6E';
const WHITE  = 'FFFFFF';
const PASS   = '1D6F42';
const FAIL   = 'C00000';
const SKIP   = 'E47D00';
const LTGRAY = 'F2F2F2';
const DKGRAY = '595959';

function statusColor(s) {
    return s === 'PASSED' ? PASS : s === 'SKIPPED' ? SKIP : FAIL;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function hd(text, level = HeadingLevel.HEADING_1) {
    return new Paragraph({ text, heading: level, spacing: { before: 280, after: 120 } });
}

function para(text, opts = {}) {
    return new Paragraph({
        children: [new TextRun({ text, size: 22, color: '1A1A1A', ...opts })],
        spacing: { after: 120 },
    });
}

function cell(text, { bold = false, color = '1A1A1A', bg = WHITE, width = 1200, align = AlignmentType.LEFT } = {}) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: String(text), bold, color, size: 18 })],
            alignment: align,
        })],
        shading: { type: ShadingType.CLEAR, fill: bg },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: width, type: WidthType.DXA },
        margins: { top: 50, bottom: 50, left: 70, right: 70 },
    });
}

function headerRow(labels, widths) {
    return new TableRow({
        children: labels.map((l, i) => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: l, bold: true, color: WHITE, size: 18 })],
            })],
            shading: { type: ShadingType.CLEAR, fill: TEAL },
            width: { size: widths[i], type: WidthType.DXA },
            margins: { top: 70, bottom: 70, left: 70, right: 70 },
        })),
        tableHeader: true,
    });
}

// ── Summary counts ────────────────────────────────────────────────────────────
let totalPass = 0, totalFail = 0, totalSkip = 0;
for (const trust of TRUSTS) {
    for (const t of TESTS) {
        const s = resultsMap[trust][t] || 'UNKNOWN';
        if (s === 'PASSED') totalPass++;
        else if (s === 'SKIPPED') totalSkip++;
        else totalFail++;
    }
}
const total = totalPass + totalFail + totalSkip;

// ── Per-trust summary rows ────────────────────────────────────────────────────
const trustSummaryColW = [2400, 1000, 1000, 1000, 1000];
const trustSummaryRows = TRUSTS.map((trust, i) => {
    const results = TESTS.map(t => resultsMap[trust][t] || '—');
    const passed = results.filter(r => r === 'PASSED').length;
    const failed = results.filter(r => r === 'FAILED').length;
    const skipped = results.filter(r => r === 'SKIPPED').length;
    const overall = failed > 0 ? 'FAILED' : skipped === TESTS.length ? 'SKIPPED' : 'PASSED';
    const bg = i % 2 === 0 ? LTGRAY : WHITE;
    return new TableRow({
        children: [
            cell(trust, { bg, width: trustSummaryColW[0] }),
            cell(String(passed), { bg, width: trustSummaryColW[1], align: AlignmentType.CENTER }),
            cell(String(failed), { bg, width: trustSummaryColW[2], align: AlignmentType.CENTER }),
            cell(String(skipped), { bg, width: trustSummaryColW[3], align: AlignmentType.CENTER }),
            cell(overall, { bold: true, color: statusColor(overall), bg, width: trustSummaryColW[4], align: AlignmentType.CENTER }),
        ],
    });
});

const trustSummaryTable = new Table({
    width: { size: 7800, type: WidthType.DXA },
    columnWidths: trustSummaryColW,
    rows: [
        headerRow(['Trust', 'Passed', 'Failed', 'Skipped', 'Overall'], trustSummaryColW),
        ...trustSummaryRows,
    ],
});

// ── Detailed matrix: trust × test ─────────────────────────────────────────────
// Column widths: trust name + 7 test columns
const shortNames = [
    'Edit Fields', 'Cancel Job', 'Close Job', 'Add Note',
    'Del Invoice', 'Biz Settings', 'User List',
];
const matrixColW = [2000, ...Array(7).fill(780)];
const matrixRows = TRUSTS.map((trust, i) => {
    const bg = i % 2 === 0 ? LTGRAY : WHITE;
    return new TableRow({
        children: [
            cell(trust, { bg, width: matrixColW[0] }),
            ...TESTS.map((t, j) => {
                const s = resultsMap[trust][t] || '—';
                const icon = s === 'PASSED' ? '✅' : s === 'SKIPPED' ? '⏭' : s === 'FAILED' ? '❌' : '—';
                return cell(icon, { bold: false, color: statusColor(s === '—' ? 'FAILED' : s), bg, width: matrixColW[j + 1], align: AlignmentType.CENTER });
            }),
        ],
    });
});

const matrixTable = new Table({
    width: { size: 7460, type: WidthType.DXA },
    columnWidths: matrixColW,
    rows: [
        headerRow(['Trust', ...shortNames], matrixColW),
        ...matrixRows,
    ],
});

// ── Document ──────────────────────────────────────────────────────────────────
const doc = new Document({
    styles: {
        paragraphStyles: [
            {
                id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
                run: { size: 32, bold: true, color: TEAL },
                paragraph: { spacing: { before: 320, after: 160 } },
            },
            {
                id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
                run: { size: 26, bold: true, color: DKGRAY },
                paragraph: { spacing: { before: 240, after: 120 } },
            },
        ],
    },
    sections: [{
        properties: {},
        children: [
            // Cover
            new Paragraph({
                children: [new TextRun({ text: 'Tapi 2 — Functional Test Report (All Trusts)', bold: true, size: 40, color: TEAL })],
                spacing: { after: 80 },
            }),
            new Paragraph({
                children: [new TextRun({ text: `Dev Environment  |  ${today}`, size: 22, color: DKGRAY })],
                spacing: { after: 320 },
            }),

            // Summary
            hd('Summary'),
            para(`Functional tests were run across all 10 configured trusts covering: Job Edit, Cancel, Close, Add Note, Invoice Delete, Business Settings, and User List.`),
            new Paragraph({
                children: [
                    new TextRun({ text: `${totalPass} / ${total} tests PASSED`, bold: true, color: PASS, size: 22 }),
                    new TextRun({ text: `   |   ${totalFail} FAILED   |   ${totalSkip} SKIPPED`, size: 22, color: DKGRAY }),
                ],
                spacing: { after: 240 },
            }),

            // Trust summary
            hd('Results by Trust'),
            trustSummaryTable,
            new Paragraph({ text: '', spacing: { after: 320 } }),

            // Detail matrix
            hd('Detailed Test Matrix'),
            para('✅ = Passed   ❌ = Failed   ⏭ = Skipped / No test data'),
            new Paragraph({ text: '', spacing: { after: 120 } }),
            matrixTable,
            new Paragraph({ text: '', spacing: { after: 320 } }),

            // Tests covered
            hd('Tests Covered'),
            ...TESTS.map((t, i) => new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${t}`, size: 22 })],
                spacing: { after: 80 },
            })),
            new Paragraph({ text: '', spacing: { after: 200 } }),
        ],
    }],
});

const outPath = 'Tapi2-Functional-Report-AllTrusts.docx';
Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync(outPath, buf);
    console.log(`✅ Report written: ${outPath}`);
});
