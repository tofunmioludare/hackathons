/**
 * APEX AUDIT — MCP Server
 *
 * Exposes the APEX AUDIT audit-trail workflow as MCP tools so any
 * MCP-compatible LLM client (Claude, GPT-4o, Gemini via bridge, etc.)
 * can trigger audited legal-case workflows on Hedera HCS without
 * knowing anything about the underlying SDK calls.
 *
 * Tools:
 *   apex_log_case     — receive a case + get AI recommendation → 2 HCS checkpoints
 *   apex_attest       — human (or agent) attestation            → 1 HCS checkpoint
 *   apex_run_audit    — convenience: full 3-checkpoint flow, auto-attested
 *
 * Run:  node src/mcp-server.js
 * Or add to claude_desktop_config.json / .mcp.json (see bottom of file)
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { runCasePhase1, runAttestation } from "./agent.js";
import dotenv from "dotenv";

dotenv.config();

// ── Server definition ─────────────────────────────────────────────────────────

const server = new Server(
    { name: "apex-audit", version: "1.0.0" },
    { capabilities: { tools: {} } },
);

// ── Tool registry ─────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "apex_log_case",
            description:
                "Submit a legal case to APEX AUDIT. Logs two immutable checkpoints to Hedera HCS: " +
                "CASE_RECEIVED (SHA-256 input hash) and AGENT_RECOMMENDATION (Claude AI analysis). " +
                "Returns the AI recommendation and HCS sequence numbers. " +
                "The case then awaits human attestation via apex_attest.",
            inputSchema: {
                type: "object",
                properties: {
                    caseId: {
                        type: "string",
                        description: "Unique case identifier, e.g. CASE-2026-IE-0041. Auto-generated if omitted.",
                    },
                    caseName: {
                        type: "string",
                        description: "Human-readable case title, e.g. 'O'Sullivan v. Dept. of Social Protection'",
                    },
                    caseType: {
                        type: "string",
                        description: "Type of legal matter: 'Benefits Eligibility', 'Contract Review', 'Regulatory Compliance', 'Legal Advice', etc.",
                    },
                    caseDescription: {
                        type: "string",
                        description: "Full description of the case facts and context for AI analysis.",
                    },
                    jurisdiction: {
                        type: "string",
                        description: "Jurisdiction, e.g. 'Ireland (EU)', 'Germany (EU)', 'England & Wales'",
                    },
                    applicant: {
                        type: "object",
                        description: "Applicant/claimant details (optional). Will be hashed and logged.",
                    },
                },
                required: ["caseName", "caseType", "caseDescription"],
            },
        },
        {
            name: "apex_attest",
            description:
                "Record a human (or authorised agent) attestation decision for a case that has already been " +
                "analysed by apex_log_case. Posts HUMAN_ATTESTATION to Hedera HCS — immutable, timestamped, " +
                "with reviewer identity. This completes the 3-checkpoint EU AI Act Art. 14/17 audit trail.",
            inputSchema: {
                type: "object",
                properties: {
                    caseId: {
                        type: "string",
                        description: "The case ID returned by apex_log_case.",
                    },
                    decision: {
                        type: "string",
                        enum: ["APPROVED", "REJECTED"],
                        description: "APPROVED to confirm the AI recommendation; REJECTED to override it.",
                    },
                    reviewerId: {
                        type: "string",
                        description: "Reviewer identifier, e.g. 'REVIEWER_001' or an agent/user ID.",
                    },
                    note: {
                        type: "string",
                        description: "Optional reviewer note explaining the decision.",
                    },
                },
                required: ["caseId", "decision"],
            },
        },
        {
            name: "apex_run_audit",
            description:
                "Run a complete 3-checkpoint APEX AUDIT in one call: CASE_RECEIVED → AGENT_RECOMMENDATION → " +
                "HUMAN_ATTESTATION. All three are posted to Hedera HCS. Use this for automated or demo flows. " +
                "For real human review, use apex_log_case + apex_attest separately.",
            inputSchema: {
                type: "object",
                properties: {
                    caseId: { type: "string", description: "Unique case ID. Auto-generated if omitted." },
                    caseName: { type: "string", description: "Case title." },
                    caseType: { type: "string", description: "Type of legal matter." },
                    caseDescription: { type: "string", description: "Full case facts for AI analysis." },
                    jurisdiction: { type: "string", description: "Jurisdiction." },
                    decision: {
                        type: "string",
                        enum: ["APPROVED", "REJECTED"],
                        description: "Attestation decision. Defaults to APPROVED.",
                    },
                    reviewerId: {
                        type: "string",
                        description: "Reviewer/agent ID for the attestation record. Defaults to APEX-MCP-AGENT.",
                    },
                    note: { type: "string", description: "Optional note for the attestation record." },
                },
                required: ["caseName", "caseType", "caseDescription"],
            },
        },
    ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    try {
        if (name === "apex_log_case") {
            const caseData = {
                caseId: args.caseId ?? `MCP-${Date.now()}`,
                caseName: args.caseName,
                caseType: args.caseType,
                caseDescription: args.caseDescription,
                jurisdiction: args.jurisdiction ?? "EU",
                applicant: args.applicant ?? null,
            };

            const result = await runCasePhase1(caseData);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: "awaiting_attestation",
                            caseId: result.caseId,
                            topicId: result.topicId,
                            hcsCheckpoints: {
                                CASE_RECEIVED: { seq: result.step1Seq },
                                AGENT_RECOMMENDATION: { seq: result.step2Seq },
                            },
                            aiRecommendation: result.recommendation,
                            hashScanUrl: `https://hashscan.io/testnet/topic/${result.topicId}`,
                            nextStep: "Call apex_attest with this caseId to complete the audit trail.",
                        }, null, 2),
                    },
                ],
            };
        }

        if (name === "apex_attest") {
            const result = await runAttestation(
                args.caseId,
                args.decision,
                args.reviewerId ?? "APEX-MCP-REVIEWER",
                args.note ?? "",
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: "audit_complete",
                            caseId: result.caseId,
                            topicId: result.topicId,
                            hcsCheckpoints: {
                                HUMAN_ATTESTATION: { seq: result.step3Seq, decision: args.decision },
                            },
                            hashScanUrl: `https://hashscan.io/testnet/topic/${result.topicId}`,
                            message: "All 3 checkpoints immutably recorded on Hedera HCS. EU AI Act Art. 14 & 17 compliant.",
                        }, null, 2),
                    },
                ],
            };
        }

        if (name === "apex_run_audit") {
            const caseData = {
                caseId: args.caseId ?? `MCP-${Date.now()}`,
                caseName: args.caseName,
                caseType: args.caseType,
                caseDescription: args.caseDescription,
                jurisdiction: args.jurisdiction ?? "EU",
            };

            const phase1 = await runCasePhase1(caseData);
            const phase2 = await runAttestation(
                phase1.caseId,
                args.decision ?? "APPROVED",
                args.reviewerId ?? "APEX-MCP-AGENT",
                args.note ?? "Auto-attested via APEX MCP tool.",
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: "audit_complete",
                            caseId: phase1.caseId,
                            topicId: phase1.topicId,
                            hcsCheckpoints: {
                                CASE_RECEIVED: { seq: phase1.step1Seq },
                                AGENT_RECOMMENDATION: { seq: phase1.step2Seq },
                                HUMAN_ATTESTATION: { seq: phase2.step3Seq, decision: args.decision ?? "APPROVED" },
                            },
                            aiRecommendation: phase1.recommendation,
                            hashScanUrl: `https://hashscan.io/testnet/topic/${phase1.topicId}`,
                            message: "Full 3-checkpoint audit trail recorded on Hedera HCS.",
                        }, null, 2),
                    },
                ],
            };
        }

        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    } catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

/*
 * ── How to connect ────────────────────────────────────────────────────────────
 *
 * Claude Desktop — add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "apex-audit": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/apex/src/mcp-server.js"],
 *       "env": {
 *         "HEDERA_ACCOUNT_ID": "...",
 *         "HEDERA_PRIVATE_KEY": "...",
 *         "HEDERA_TOPIC_ID": "...",
 *         "ANTHROPIC_API_KEY": "..."
 *       }
 *     }
 *   }
 * }
 *
 * Claude Code (.mcp.json in project root) — see mcp.json generated alongside this file.
 *
 * Other LLMs — any MCP-compatible client can connect via stdio transport.
 * ─────────────────────────────────────────────────────────────────────────────
 */
