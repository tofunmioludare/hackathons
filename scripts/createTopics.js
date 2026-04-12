/**
 * One-time setup: create the three HCS topics APEX needs.
 * Run once: node scripts/createTopics.js
 * Copy the output IDs into your .env file.
 */
import dotenv from "dotenv";
import { createTopic } from "../src/hedera/topics.js";
import { getClient } from "../src/hedera/client.js";

dotenv.config();

async function main() {
    console.log(`Creating APEX HCS topics on ${process.env.HEDERA_NETWORK}...`);
    console.log(`Operator: ${process.env.HEDERA_ACCOUNT_ID}\n`);

    // 1. Market Registry — public log of all prediction markets created
    const registryTopicId = await createTopic(
        "APEX:MarketRegistry — public log of all prediction markets",
        false, // open: any agent can read
    );
    console.log(`APEX_MARKET_REGISTRY_TOPIC_ID=${registryTopicId}`);

    // 2. Negotiation Channel — agents post bids, asks, and counter-offers
    const negotiationTopicId = await createTopic(
        "APEX:Negotiation — agent bid/ask negotiation channel",
        false, // open: any agent can post
    );
    console.log(`APEX_NEGOTIATION_TOPIC_ID=${negotiationTopicId}`);

    // 3. Settlement Channel — final settlement records (operator-restricted)
    const settlementTopicId = await createTopic(
        "APEX:Settlement — final market outcomes and HBAR settlement records",
        true, // restricted: only operator posts settlements
    );
    console.log(`APEX_SETTLEMENT_TOPIC_ID=${settlementTopicId}`);

    console.log("\nPaste these lines into your .env file.");
    getClient().close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
