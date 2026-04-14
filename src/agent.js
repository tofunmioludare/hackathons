/**
 * Copyright (c) 2026 Tofunmi Oludare and Patrick Belinga. All rights reserved.
 * Proprietary and confidential. Unauthorised copying, distribution, or use is prohibited.
 */

/**
 * APEX AUDIT — AI Caseworker Agent
 *
 * Runs a single case through the full audit lifecycle:
 *   1. CASE_RECEIVED       — hash of input logged to HCS
 *   2. AGENT_RECOMMENDATION — Claude's decision + reasoning logged to HCS
 *   3. HUMAN_ATTESTATION   — reviewer approval/override logged to HCS
 *
 * Usage (standalone): node src/agent.js
 * Usage (from orchestrator): import { runAuditedCase } from "./agent.js"
 */
import Anthropic from "@anthropic-ai/sdk";
import {
    Client,
    AccountId,
    PrivateKey,
    TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { createHash } from "crypto";
import dotenv from "dotenv";

dotenv.config();

// ── Clients ──────────────────────────────────────────────────────────────────

function buildHederaClient() {
    return Client.forTestnet().setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY),
    );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── HCS helpers ───────────────────────────────────────────────────────────────

async function postAuditEvent(client, topicId, payload) {
    const message = JSON.stringify(payload);
    const response = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .execute(client);
    const receipt = await response.getReceipt(client);
    const seq = Number(receipt.topicSequenceNumber);
    console.log(`  ✓ HCS #${seq} — ${payload.event}`);
    return seq;
}

function sha256(data) {
    return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// ── Phase 1: Receive case + get AI recommendation ────────────────────────────

export async function runCasePhase1(caseData) {
    const client = buildHederaClient();
    const topicId = process.env.HEDERA_TOPIC_ID;
    const caseId = caseData.caseId ?? `CASE-${Date.now()}`;

    console.log(`\n─── APEX AUDIT [Phase 1]: ${caseId} ─────────────────────`);

    // Step 1: CASE_RECEIVED
    console.log("[1/2] Logging case receipt to HCS...");
    const inputHash = sha256(caseData);
    const step1Seq = await postAuditEvent(client, topicId, {
        event: "CASE_RECEIVED",
        caseId,
        inputHash,
        fileName: caseData._fileName ?? null,
        fileHash: caseData._fileHash ?? null,
        timestamp: new Date().toISOString(),
        agentId: "APEX-CASEWORKER-v1",
    });

    // Step 2: AGENT_RECOMMENDATION
    console.log("[2/2] Calling Claude caseworker agent...");

    const caseType = caseData.caseType || "legal case";
    const jurisdiction = caseData.jurisdiction || "UK";

    const systemPrompt = `You are an expert AI legal analyst working at a top law firm. Analyse the case and respond with valid JSON only — no markdown, no explanation outside the JSON.

Schema:
{
  "eligible": true | false,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "outcome": "one concise sentence stating your determination",
  "reasoning": "2-3 sentences referencing specific facts, legislation, or precedents relevant to this case",
  "flags": ["any legal concerns, risks, or items requiring human review"]
}

For eligibility/benefits cases: eligible = claimant satisfies criteria.
For contract/review cases: eligible = document is sound / acceptable.
For advice cases: eligible = client's position is defensible / recommended course is viable.`;

    const msg = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: `Analyse this ${caseType} (jurisdiction: ${jurisdiction}):\n\nCase Name: ${caseData.caseName || caseData.caseId}\nDescription: ${caseData.caseDescription || ""}\n\nFull case data:\n${JSON.stringify(caseData, null, 2)}` }],
    });

    let recommendation;
    try {
        recommendation = JSON.parse(msg.content[0].text);
    } catch {
        const m = msg.content[0].text.match(/\{[\s\S]*\}/);
        recommendation = m ? JSON.parse(m[0]) : { error: "parse_failed", raw: msg.content[0].text };
    }

    console.log(`  Decision: ${recommendation.eligible ? "ELIGIBLE ✓" : "NOT ELIGIBLE ✗"} (${recommendation.confidence})`);

    const step2Seq = await postAuditEvent(client, topicId, {
        event: "AGENT_RECOMMENDATION",
        caseId,
        eligible: recommendation.eligible,
        confidence: recommendation.confidence,
        outcome: recommendation.outcome,
        reasoning: recommendation.reasoning,
        flags: recommendation.flags ?? [],
        modelId: "claude-opus-4-6",
        timestamp: new Date().toISOString(),
    });

    console.log(`  Awaiting human attestation for ${caseId}...`);
    client.close();
    return { caseId, topicId, recommendation, step1Seq, step2Seq };
}

// ── Phase 2: Human attestation ────────────────────────────────────────────────

export async function runAttestation(caseId, decision, reviewerId, note) {
    const client = buildHederaClient();
    const topicId = process.env.HEDERA_TOPIC_ID;

    console.log(`\n─── APEX AUDIT [Phase 2]: ${caseId} ─────────────────────`);
    console.log(`  Reviewer: ${reviewerId} | Decision: ${decision}`);

    const step3Seq = await postAuditEvent(client, topicId, {
        event: "HUMAN_ATTESTATION",
        caseId,
        decision,
        reviewerId,
        note: note ?? "",
        timestamp: new Date().toISOString(),
    });

    console.log(`  ✓ Attestation recorded — HCS #${step3Seq}`);
    console.log(`  HashScan: https://hashscan.io/testnet/topic/${topicId}`);
    client.close();
    return { caseId, topicId, step3Seq };
}

// ── Convenience: full auto flow (used by standalone runner) ──────────────────

export async function runAuditedCase(caseData, reviewerId = "REVIEWER_001") {
    const phase1 = await runCasePhase1(caseData);
    await new Promise((r) => setTimeout(r, 3000));
    const phase2 = await runAttestation(phase1.caseId, "APPROVED", reviewerId, "Auto-approved in demo mode.");
    return { ...phase1, ...phase2 };
}

// ── Standalone demo ───────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("agent.js")) {
    runAuditedCase({
        caseId: "UC-2026-00142",
        applicant: { name: "Alex Johnson", age: 34, nationalInsuranceNumber: "AB123456C" },
        employment: { status: "unemployed", lastEmployed: "2025-11-01", seekingWork: true },
        housing: { tenure: "private_renter", monthlyRent: 950, location: "Manchester" },
        savings: { totalSavings: 3200 },
        dependants: 1,
        healthConditions: [],
    }).catch((err) => { console.error(err); process.exit(1); });
}
