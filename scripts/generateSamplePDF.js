/**
 * Copyright (c) 2026 Tofunmi Oludare and Patrick Belinga. All rights reserved.
 * Proprietary and confidential. Unauthorised copying, distribution, or use is prohibited.
 */

/**
 * Generates public/sample-case.pdf — a realistic legal case document
 * for APEX AUDIT upload testing. No external dependencies required.
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sample-case.pdf");

// ── PDF primitives ────────────────────────────────────────────────────────────

const offsets = [];
let buf = "";

function w(s) { buf += s; }
function wl(s) { buf += s + "\n"; }

function objStart(n) {
  offsets[n] = buf.length;
  wl(`${n} 0 obj`);
}
function objEnd() { wl("endobj"); wl(""); }

// Encode text for PDF content streams (basic latin + some extended)
function esc(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// ── Page content builder ──────────────────────────────────────────────────────

const W = 595, H = 842; // A4 points
const ML = 60, MR = 60, MT = 60;
const pageW = W - ML - MR;

// All text chunks: { text, x, y, size, bold, rgb }
const ops = [];
let cy = H - MT;

function newPage() { cy = H - MT; }
function gap(n = 8) { cy -= n; }

function line(text, opts = {}) {
  const { size = 10, bold = false, rgb = [0, 0, 0], x = ML, indent = 0 } = opts;
  ops.push({ text, x: x + indent, y: cy, size, bold, rgb });
  cy -= size * 1.5;
}

function rule(y, thick = false) {
  ops.push({ rule: true, y, thick });
}

function section(title) {
  gap(10);
  rule(cy);
  gap(4);
  line(title, { size: 9, bold: true, rgb: [0.26, 0.22, 0.79] });
  gap(2);
}

function label(k, v, indent = 0) {
  ops.push({ label: true, k, v, x: ML + indent, y: cy, size: 9 });
  cy -= 9 * 1.55;
}

function bullet(text, indent = 12) {
  ops.push({ bullet: true, text, x: ML + indent, y: cy, size: 9 });
  cy -= 9 * 1.55;
}

// ── Document content ──────────────────────────────────────────────────────────

newPage();

// Header bar (drawn as filled rect via ops)
ops.push({ rect: true, x: 0, y: H - 42, w: W, h: 42, rgb: [0.26, 0.22, 0.79] });
ops.push({ text: "APEX AUDIT — Legal Case Submission", x: ML, y: H - 27, size: 13, bold: true, rgb: [1, 1, 1] });
ops.push({ text: "CONFIDENTIAL  ·  Legal Professional Privilege", x: W - MR - 162, y: H - 27, size: 8, bold: false, rgb: [0.69, 0.67, 0.95] });
ops.push({ text: "Hartley & Cross LLP  ·  Prepared: 12 April 2026  ·  Ref: HC-2026-NL-0101", x: ML, y: H - 38, size: 7.5, bold: false, rgb: [0.78, 0.77, 0.96] });

cy = H - 58;

// Case title block
gap(4);
line("Van der Berg v. NexaTech BV", { size: 15, bold: true, rgb: [0.06, 0.09, 0.26] });
line("Wrongful Dismissal & EU AI Act Bias Claim", { size: 11, rgb: [0.28, 0.33, 0.45] });
gap(4);
rule(cy, true);
gap(6);

// Key facts row
label("Case Reference", "HC-2026-NL-0101");
label("Jurisdiction", "Netherlands (EU) — Rechtbank Amsterdam, Sector Kanton");
label("Case Type", "Employment Law / AI Discrimination");
label("Filed", "10 April 2026");
label("Hearing Date", "3 June 2026");
label("Priority", "URGENT");
label("Regulatory Framework", "EU AI Act (2024/1689) · Dutch Civil Code Art. 7:681 · GDPR Art. 22");

section("PARTIES");

line("Claimant", { size: 9, bold: true });
gap(2);
label("Name", "Ingrid van der Berg", 12);
label("Date of Birth", "22 July 1984", 12);
label("Former Role", "Senior Data Analyst, NexaTech BV", 12);
label("Employment Period", "1 March 2019 – 15 January 2026", 12);
label("Representative", "Hartley & Cross LLP", 12);
gap(4);
line("Respondent", { size: 9, bold: true });
gap(2);
label("Name", "NexaTech BV", 12);
label("Registration", "NL 63841726", 12);
label("Industry", "FinTech / AI-Powered Credit Services", 12);
label("Address", "Herengracht 420, 1017 BZ Amsterdam", 12);

section("SUMMARY OF FACTS");
gap(2);

const facts = [
  "The claimant was dismissed on 15 January 2026 following an automated performance review conducted by",
  "NexaTech's proprietary AI system 'PerfEval v3.2'. The system rated the claimant in the bottom 8% of the",
  "analytics division, triggering an automatic redundancy selection without independent human review.",
  "",
  "The claimant contends that the training data underlying PerfEval v3.2 contains systematic bias against",
  "employees who took parental leave during the 2022–2024 evaluation window. The claimant took 6 months'",
  "parental leave (April–September 2023) under Dutch law. Output metrics were calculated across this period",
  "without adjustment for legally protected absences.",
];
facts.forEach(t => { if (t) line(t, { size: 9 }); else gap(5); });

section("KEY FACTS");
gap(2);
const kf = [
  "Claimant took 6 months' parental leave (April–September 2023) under Dutch law.",
  "PerfEval v3.2 calculated performance scores using 2022–2025 output metrics with no absence adjustment.",
  "NexaTech HR confirmed AI recommendation was implemented with no independent human review step.",
  "NexaTech has not produced conformity assessment, technical documentation, or oversight logs (Arts. 9, 11, 14).",
  "Three other employees dismissed in same round also took parental leave during 2022–2024.",
  "PerfEval v3.2 deployed across 340 employees in 4 EU member states — self-classified as 'low-risk'.",
  "Dutch Data Protection Authority (AP) notified under GDPR Art. 22(3); claimant not informed of right to contest.",
];
kf.forEach(t => bullet(t));

section("LEGAL ARGUMENTS");
gap(2);

line("Ground 1 — Wrongful Dismissal (Dutch Civil Code Art. 7:681)", { size: 9, bold: true });
gap(2);
[
  "The dismissal was procedurally and substantively unfair. The redundancy selection was entirely driven by an",
  "automated performance score that failed to account for legally protected parental leave, rendering the",
  "selection criteria invalid under Dutch employment law.",
].forEach(t => line(t, { size: 9, indent: 12 }));

gap(6);
line("Ground 2 — EU AI Act Violation — High-Risk System Misclassification", { size: 9, bold: true });
gap(2);
[
  "PerfEval v3.2 constitutes a high-risk AI system under EU AI Act Annex III, Category 4 (employment, workers",
  "management and access to employment). NexaTech's self-classification as low-risk is unlawful. The system",
  "was deployed without a conformity assessment, human oversight mechanisms, or the technical documentation",
  "required by Arts. 9–15. Enforcement deadline: August 2026. Penalty exposure: up to €15M or 3% revenue.",
].forEach(t => line(t, { size: 9, indent: 12 }));

gap(6);
line("Ground 3 — GDPR Art. 22 — Automated Decision-Making Without Safeguards", { size: 9, bold: true });
gap(2);
[
  "The dismissal constitutes a solely automated decision producing significant legal effects. NexaTech failed",
  "to (a) inform the claimant of the automated nature of the decision, (b) provide meaningful information",
  "about the logic involved, or (c) offer the right to obtain human review — material breach of Art. 22(3).",
].forEach(t => line(t, { size: 9, indent: 12 }));

gap(6);
line("Ground 4 — Indirect Discrimination (Parental Leave Proxy)", { size: 9, bold: true });
gap(2);
[
  "The output metric bias against employees with parental leave absences constitutes indirect discrimination",
  "on the basis of sex and family status, contrary to Directive 2000/78/EC and Dutch implementing legislation.",
].forEach(t => line(t, { size: 9, indent: 12 }));

section("EVIDENCE SCHEDULE");
gap(2);

const ev = [
  ["EX-01", "PerfEval v3.2 algorithmic output for I. van der Berg (2022–2025)", "Requested — DSAR overdue 47 days"],
  ["EX-02", "NexaTech internal comms confirming no human review for automated dismissals", "Obtained"],
  ["EX-03", "Employment contract and parental leave records (2019–2026)", "Obtained"],
  ["EX-04", "Names and leave records of three co-workers dismissed in same round", "Pending (Privacy review)"],
  ["EX-05", "Expert report: Dr. F. Müller, AI Systems Auditor — bias analysis of PerfEval", "Commissioned"],
  ["EX-06", "AP notification receipt and case reference (GDPR Art. 22 complaint)", "Obtained"],
];
ev.forEach(([id, desc, status]) => {
  ops.push({ evrow: true, id, desc, status, x: ML, y: cy, size: 8.5 });
  cy -= 8.5 * 1.8;
});

section("REMEDY SOUGHT");
gap(2);
bullet("Reinstatement to role of Senior Data Analyst with full back-pay from 15 January 2026");
bullet("Alternative: Compensation — 18 months' gross salary (€94,500) plus legal costs");
bullet("Declaration that PerfEval v3.2 constitutes a high-risk AI system requiring EU AI Act conformity audit");
bullet("Injunction restraining NexaTech from using PerfEval v3.2 for employment decisions pending audit");
bullet("Referral to Netherlands Market Surveillance Authority (RVO) for EU AI Act enforcement investigation");

section("RISK ASSESSMENT");
gap(2);
label("Overall Risk", "HIGH — Risk Score: 82/100");
label("Liability Exposure", "€120,000–€180,000 (employment) + up to €15M regulatory (EU AI Act Art. 71)");
gap(4);
line("Key Risks:", { size: 9, bold: true });
gap(2);
bullet("NexaTech DSAR non-compliance may result in adverse inference at hearing");
bullet("AP investigation may run in parallel — outcome could influence civil proceedings");
bullet("Three co-workers with similar profiles strengthens systemic discrimination argument");

gap(4);
line("Strengths:", { size: 9, bold: true });
gap(2);
bullet("Clear documentary evidence of absent human review step");
bullet("Regulatory framework strongly supports claimant position post-EU AI Act");
bullet("Expert witness secured with EU AI Act audit credentials");
bullet("Parental leave timeline vs. scoring window straightforward to establish");

// Footer line
gap(14);
rule(cy);
gap(5);
ops.push({ text: "This document is prepared for submission to APEX AUDIT for AI-assisted legal analysis and immutable audit trail logging on Hedera HCS.", x: ML, y: cy, size: 7.5, rgb: [0.5, 0.5, 0.5] });
cy -= 7.5 * 1.5;
ops.push({ text: "All checkpoints — CASE_RECEIVED, AGENT_RECOMMENDATION, HUMAN_ATTESTATION — will be permanently recorded. Confidential · Subject to Legal Professional Privilege.", x: ML, y: cy, size: 7.5, rgb: [0.5, 0.5, 0.5] });

// ── Render content stream ─────────────────────────────────────────────────────

function renderContentStream() {
  let s = "";
  for (const op of ops) {
    if (op.rect) {
      const [r, g, b] = op.rgb;
      s += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
      s += `${op.x} ${op.y} ${op.w} ${op.h} re f\n`;
      s += `0 0 0 rg\n`;
      continue;
    }
    if (op.rule) {
      const lw = op.thick ? 0.75 : 0.25;
      s += `${lw} w\n`;
      s += `0.85 0.85 0.9 RG\n`;
      s += `${ML} ${op.y} m ${W - MR} ${op.y} l S\n`;
      s += `0 0 0 RG\n0.5 w\n`;
      continue;
    }
    if (op.label) {
      const [r, g, b] = [0.28, 0.33, 0.45];
      s += `BT /F2 ${op.size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${op.x} ${op.y} Td (${esc(op.k + ":  ")}) Tj ET\n`;
      s += `BT /F1 ${op.size} Tf 0 0 0 rg ${op.x + 110} ${op.y} Td (${esc(op.v)}) Tj ET\n`;
      continue;
    }
    if (op.bullet) {
      s += `BT /F1 9 Tf 0.26 0.22 0.79 rg ${op.x} ${op.y} Td (•) Tj ET\n`;
      s += `BT /F1 ${op.size} Tf 0 0 0 rg ${op.x + 10} ${op.y} Td (${esc(op.text)}) Tj ET\n`;
      continue;
    }
    if (op.evrow) {
      s += `BT /F2 ${op.size} Tf 0.26 0.22 0.79 rg ${op.x} ${op.y} Td (${esc(op.id)}) Tj ET\n`;
      s += `BT /F1 ${op.size} Tf 0 0 0 rg ${op.x + 36} ${op.y} Td (${esc(op.desc)}) Tj ET\n`;
      const statusColor = op.status === "Obtained" ? [0.02, 0.47, 0.38] : op.status.includes("overdue") ? [0.73, 0.11, 0.12] : [0.45, 0.27, 0.02];
      s += `BT /F2 ${op.size} Tf ${statusColor.map(x=>x.toFixed(3)).join(" ")} rg ${op.x + 340} ${op.y} Td (${esc(op.status)}) Tj ET\n`;
      continue;
    }
    // Normal text
    const font = op.bold ? "F2" : "F1";
    const [r, g, b] = op.rgb || [0, 0, 0];
    s += `BT /${font} ${op.size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${op.x} ${op.y} Td (${esc(op.text)}) Tj ET\n`;
  }
  return s;
}

// ── Assemble PDF ──────────────────────────────────────────────────────────────

const content = renderContentStream();
const contentBytes = Buffer.from(content, "latin1");

wl("%PDF-1.4");
wl("%\xc2\xa5\xc2\xb1\xc3\xab\n");

// Object 1: Catalog
objStart(1);
wl("<<");
wl("  /Type /Catalog");
wl("  /Pages 2 0 R");
wl(">>");
objEnd();

// Object 2: Pages
objStart(2);
wl("<<");
wl("  /Type /Pages");
wl("  /Kids [3 0 R]");
wl("  /Count 1");
wl(">>");
objEnd();

// Object 3: Page
objStart(3);
wl("<<");
wl("  /Type /Page");
wl("  /Parent 2 0 R");
wl(`  /MediaBox [0 0 ${W} ${H}]`);
wl("  /Contents 4 0 R");
wl("  /Resources <<");
wl("    /Font <<");
wl("      /F1 5 0 R");
wl("      /F2 6 0 R");
wl("    >>");
wl("  >>");
wl(">>");
objEnd();

// Object 4: Content stream
objStart(4);
wl("<<");
wl(`  /Length ${contentBytes.length}`);
wl(">>");
wl("stream");
buf += content;
wl("endstream");
objEnd();

// Object 5: Font Helvetica
objStart(5);
wl("<<");
wl("  /Type /Font");
wl("  /Subtype /Type1");
wl("  /BaseFont /Helvetica");
wl("  /Encoding /WinAnsiEncoding");
wl(">>");
objEnd();

// Object 6: Font Helvetica-Bold
objStart(6);
wl("<<");
wl("  /Type /Font");
wl("  /Subtype /Type1");
wl("  /BaseFont /Helvetica-Bold");
wl("  /Encoding /WinAnsiEncoding");
wl(">>");
objEnd();

// xref + trailer
const xrefOffset = buf.length;
wl("xref");
wl(`0 ${offsets.length}`);
wl("0000000000 65535 f ");
for (let i = 1; i < offsets.length; i++) {
  wl(offsets[i].toString().padStart(10, "0") + " 00000 n ");
}
wl("trailer");
wl("<<");
wl(`  /Size ${offsets.length}`);
wl("  /Root 1 0 R");
wl(">>");
wl("startxref");
wl(String(xrefOffset));
w("%%EOF");

writeFileSync(OUT, Buffer.from(buf, "latin1"));
console.log(`✓ Written: ${OUT}`);
console.log(`  Size: ${(buf.length / 1024).toFixed(1)} KB`);
