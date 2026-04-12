import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

let _client = null;

export function getClient() {
    if (_client) return _client;

    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    _client = Client.forName(process.env.HEDERA_NETWORK ?? "testnet")
        .setOperator(accountId, privateKey);

    return _client;
}

export function getOperatorKey() {
    return PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
}

export function getOperatorId() {
    return AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
}
