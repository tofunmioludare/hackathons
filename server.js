/**
 * APEX AUDIT — Dashboard server
 *
 * Endpoints:
 *   GET  /           → dashboard HTML
 *   POST /run-case   → start a new case (JSON or file metadata)
 *   POST /attest     → human approves or rejects a pending case
 *   GET  /pending    → list cases awaiting human review
 */
import { createServer } from "http";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { runCasePhase1, runAttestation } from "./src/agent.js";

dotenv.config();

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT ?? 3000;

// In-memory store of cases awaiting human attestation
const pendingCases = new Map(); // caseId → { caseId, recommendation, step1Seq, step2Seq, startedAt }

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try { resolve(JSON.parse(body || "{}")); }
            catch { reject(new Error("Invalid JSON")); }
        });
        req.on("error", reject);
    });
}

function json(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(data));
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
        return res.end();
    }

    // ── GET static HTML pages
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = readFileSync(resolve(__dirname, "public/index.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(html);
    }
    if (req.method === "GET" && url.pathname === "/about.html") {
        const html = readFileSync(resolve(__dirname, "public/about.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(html);
    }
    if (req.method === "GET" && url.pathname === "/sample-case.pdf") {
        const data = readFileSync(resolve(__dirname, "public/sample-case.pdf"));
        res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="sample-case.pdf"' });
        return res.end(data);
    }

    // ── GET /pending → list cases awaiting review
    if (url.pathname === "/pending" && req.method === "GET") {
        const list = [...pendingCases.values()].map(c => ({
            caseId: c.caseId,
            eligible: c.recommendation?.eligible,
            confidence: c.recommendation?.confidence,
            outcome: c.recommendation?.outcome,
            reasoning: c.recommendation?.reasoning,
            flags: c.recommendation?.flags ?? [],
            startedAt: c.startedAt,
            step1Seq: c.step1Seq,
            step2Seq: c.step2Seq,
        }));
        return json(res, 200, list);
    }

    // ── POST /run-case → start new case
    if (url.pathname === "/run-case" && req.method === "POST") {
        let body;
        try { body = await readBody(req); } catch { return json(res, 400, { error: "Invalid JSON" }); }

        // Build case data — pass through whatever the client sends, no demo defaults
        const caseData = {
            caseId: body.caseId ?? `UC-${Date.now()}`,
            caseName: body.caseName ?? null,
            caseType: body.caseType ?? null,
            caseDescription: body.caseDescription ?? null,
            jurisdiction: body.jurisdiction ?? "EU",
            // Structured fields only if explicitly provided (e.g. from runDemo.js)
            ...(body.applicant     && { applicant:        body.applicant }),
            ...(body.employment    && { employment:       body.employment }),
            ...(body.housing       && { housing:          body.housing }),
            ...(body.savings       && { savings:          body.savings }),
            ...(body.dependants    !== undefined && { dependants: body.dependants }),
            ...(body.healthConditions && { healthConditions: body.healthConditions }),
            // File metadata (hash computed in browser — file itself never sent to server)
            _fileName: body.fileName ?? null,
            _fileHash: body.fileHash ?? null,
        };

        // Respond immediately — processing is async
        json(res, 202, { status: "started", caseId: caseData.caseId });

        // Run phase 1 async, store result for human review
        runCasePhase1(caseData)
            .then((result) => {
                pendingCases.set(result.caseId, { ...result, startedAt: new Date().toISOString() });
                console.log(`\n  Case ${result.caseId} awaiting human review`);
            })
            .catch(console.error);

        return;
    }

    // ── POST /attest → human decision
    if (url.pathname === "/attest" && req.method === "POST") {
        let body;
        try { body = await readBody(req); } catch { return json(res, 400, { error: "Invalid JSON" }); }

        const { caseId, decision, reviewerId, note } = body;

        if (!caseId || !decision) return json(res, 400, { error: "caseId and decision required" });
        if (!["APPROVED", "REJECTED"].includes(decision)) return json(res, 400, { error: "decision must be APPROVED or REJECTED" });
        if (!pendingCases.has(caseId)) return json(res, 404, { error: "Case not found or already attested" });

        // Remove from pending immediately to prevent double-submission
        pendingCases.delete(caseId);
        json(res, 202, { status: "attesting", caseId });

        runAttestation(caseId, decision, reviewerId ?? "REVIEWER_001", note ?? "")
            .catch(console.error);

        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

server.listen(PORT, () => {
    console.log(`\nAPEX AUDIT dashboard  → http://localhost:${PORT}`);
    console.log(`HashScan topic        → https://hashscan.io/testnet/topic/${process.env.HEDERA_TOPIC_ID}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /run-case   start a new audited case`);
    console.log(`  POST /attest     submit human attestation`);
    console.log(`  GET  /pending    list cases awaiting review\n`);
});
