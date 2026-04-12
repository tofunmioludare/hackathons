import {
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    TopicInfoQuery,
} from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "./client.js";

/**
 * Create an HCS topic.
 * @param {string} memo - Human-readable description
 * @param {boolean} restricted - If true, only operator can submit messages
 * @returns {Promise<string>} Topic ID as string
 */
export async function createTopic(memo, restricted = false) {
    const client = getClient();
    const operatorKey = getOperatorKey();

    const tx = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setAdminKey(operatorKey);

    if (restricted) {
        tx.setSubmitKey(operatorKey);
    }

    const { topicId } = await (await tx.execute(client)).getReceipt(client);
    return topicId.toString();
}

/**
 * Submit a JSON message to a topic.
 * @param {string} topicId
 * @param {object} payload - Will be JSON-serialized
 * @returns {Promise<number>} Sequence number
 */
export async function submitMessage(topicId, payload) {
    const client = getClient();
    const message = JSON.stringify(payload);

    const response = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .execute(client);

    const receipt = await response.getReceipt(client);
    return Number(receipt.topicSequenceNumber);
}

/**
 * Subscribe to a topic and invoke callback for each message.
 * @param {string} topicId
 * @param {(payload: object, meta: {seq: number, timestamp: Date}) => void} onMessage
 * @param {number} startTime - Unix epoch seconds (0 = from beginning)
 * @returns {import("@hashgraph/sdk").SubscriptionHandle}
 */
export function subscribeTopic(topicId, onMessage, startTime = 0) {
    const client = getClient();

    const handle = new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(startTime)
        .subscribe(
            client,
            (_, error) => console.error(`[HCS] Subscription error on ${topicId}:`, error),
            (message) => {
                const raw = Buffer.from(message.contents).toString("utf8");
                try {
                    const payload = JSON.parse(raw);
                    onMessage(payload, {
                        seq: Number(message.sequenceNumber),
                        timestamp: message.consensusTimestamp.toDate(),
                    });
                } catch {
                    console.warn(`[HCS] Non-JSON message on ${topicId}:`, raw);
                }
            },
        );

    return handle;
}

/**
 * Query the current state of a topic.
 * @param {string} topicId
 */
export async function getTopicInfo(topicId) {
    const client = getClient();
    return await new TopicInfoQuery().setTopicId(topicId).execute(client);
}
