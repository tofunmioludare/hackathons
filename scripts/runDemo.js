/**
 * Copyright (c) 2026 Tofunmi Oludare and Patrick Belinga. All rights reserved.
 * Proprietary and confidential. Unauthorised copying, distribution, or use is prohibited.
 */

/**
 * APEX AUDIT — Demo runner
 *
 * Runs a full 3-checkpoint audit trail (CASE_RECEIVED → AGENT_RECOMMENDATION
 * → HUMAN_ATTESTATION) with a sample benefits-eligibility case.
 *
 * Run: npm run demo
 *      node scripts/runDemo.js
 */
import dotenv from "dotenv";
import { runAuditedCase } from "../src/agent.js";

dotenv.config();

const DEMO_CASE = {
    caseId: `DEMO-${Date.now()}`,
    caseName: "Universal Credit Eligibility — Johnson",
    caseType: "Benefits Eligibility",
    caseDescription:
        "Applicant Alex Johnson, aged 34, was made redundant on 2025-11-01 and is " +
        "actively seeking work. Currently renting privately in Manchester at £950/month. " +
        "Has £3,200 in savings and one dependent child. No declared health conditions. " +
        "Applying for Universal Credit under standard eligibility criteria.",
    jurisdiction: "England & Wales",
    applicant: { name: "Alex Johnson", age: 34, nationalInsuranceNumber: "AB123456C" },
    employment: { status: "unemployed", lastEmployed: "2025-11-01", seekingWork: true },
    housing: { tenure: "private_renter", monthlyRent: 950, location: "Manchester" },
    savings: { totalSavings: 3200 },
    dependants: 1,
    healthConditions: [],
};

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  APEX AUDIT — Demo Run");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

runAuditedCase(DEMO_CASE, "DEMO-REVIEWER")
    .then((result) => {
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("  Audit complete");
        console.log(`  Case ID  : ${result.caseId}`);
        console.log(`  Topic    : ${result.topicId}`);
        console.log(`  HCS seqs : #${result.step1Seq} → #${result.step2Seq} → #${result.step3Seq}`);
        console.log(`  HashScan : https://hashscan.io/testnet/topic/${result.topicId}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    })
    .catch((err) => {
        console.error("Demo failed:", err.message);
        process.exit(1);
    });
