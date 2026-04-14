/**
 * Copyright (c) 2026 Tofunmi Oludare and Patrick Belinga. All rights reserved.
 * Proprietary and confidential. Unauthorised copying, distribution, or use is prohibited.
 */

/**
 * APEX AUDIT — One-time setup
 * Creates the HCS audit trail topic on Hedera testnet.
 * Writes HEDERA_TOPIC_ID back to .env automatically.
 *
 * Run: node scripts/setup.js
 */
import {
    Client,
    AccountId,
    PrivateKey,
    TopicCreateTransaction,
} from "@hashgraph/sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    const client = Client.forTestnet().setOperator(accountId, privateKey);

    console.log("Creating APEX AUDIT HCS topic on Hedera testnet...");
    console.log(`Operator: ${process.env.HEDERA_ACCOUNT_ID}\n`);

    const { topicId } = await (
        await new TopicCreateTransaction()
            .setTopicMemo("APEX AUDIT — immutable AI agent decision trail")
            .setAdminKey(privateKey)
            // No submitKey = open topic; any agent can post
            .execute(client)
    ).getReceipt(client);

    const topicIdStr = topicId.toString();

    console.log(`✓ Topic created: ${topicIdStr}`);
    console.log(`✓ HashScan: https://hashscan.io/testnet/topic/${topicIdStr}\n`);

    // Write HEDERA_TOPIC_ID back into .env
    const envPath = resolve(process.cwd(), ".env");
    let envContent = readFileSync(envPath, "utf8");

    if (envContent.includes("HEDERA_TOPIC_ID=")) {
        envContent = envContent.replace(/HEDERA_TOPIC_ID=.*/g, `HEDERA_TOPIC_ID=${topicIdStr}`);
    } else {
        envContent += `\nHEDERA_TOPIC_ID=${topicIdStr}\n`;
    }

    writeFileSync(envPath, envContent);
    console.log(`✓ HEDERA_TOPIC_ID=${topicIdStr} written to .env`);

    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
