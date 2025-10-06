import sha256Hash from "../hash";
import Storage from "../localStorage";
import {
  getCachedSparkTransactions,
  getSparkTokenTransactions,
} from "../spark";
import { bulkUpdateSparkTransactions } from "../spark/transactions";

import { convertToBech32m } from "./bech32";
import tokenBufferAmountToDecimal from "./bufferToDecimal";
import { getCachedTokens } from "./cachedTokens";
import { Buffer } from "buffer";

const MINUTE_BUFFER = 1000 * 60;
export async function getLRC20Transactions({
  ownerPublicKeys,
  sparkAddress,
  isInitialRun,
  mnemonic,
}) {
  const storedDate = Storage.getItem("lastRunLRC20Tokens") || 0;
  const [savedTxs, cachedTokens, tokenTxs] = await Promise.all([
    getCachedSparkTransactions(null, ownerPublicKeys[0]),
    getCachedTokens(),
    getSparkTokenTransactions({ ownerPublicKeys, mnemonic }),
  ]);
  console.log(savedTxs, cachedTokens, tokenTxs);

  if (!tokenTxs?.tokenTransactionsWithStatus) return;
  const tokenTransactions = tokenTxs.tokenTransactionsWithStatus;

  const savedIds = new Set(savedTxs?.map((tx) => tx.sparkID) || []);

  let timeCutoff =
    storedDate && isInitialRun ? storedDate - 1000 * 60 * 60 * 24 : storedDate;

  let newTxs = [];

  for (const tokenTx of tokenTransactions) {
    const tokenReceivedDate = new Date(
      tokenTx.tokenTransaction.clientCreatedTimestamp
    );
    const tokenOutput = tokenTx.tokenTransaction.tokenOutputs[0];
    const tokenIdentifier = tokenOutput?.tokenIdentifier;

    const tokenIdentifierHex = Buffer.from(tokenIdentifier).toString("hex");

    if (!tokenIdentifier) continue;
    const tokenbech32m = convertToBech32m(tokenIdentifierHex);

    if (!cachedTokens[sha256Hash(mnemonic)]?.[tokenbech32m]) {
      console.log("NO TOKEN DATA FOUND");
      continue;
    }

    if (tokenReceivedDate < timeCutoff - MINUTE_BUFFER) continue;

    const tokenOutputs = tokenTx.tokenTransaction.tokenOutputs;

    const ownerPublicKey = Buffer.from(
      tokenOutputs[0]?.ownerPublicKey
    ).toString("hex");
    const amount = Number(
      tokenBufferAmountToDecimal(tokenOutputs[0]?.tokenAmount)
    );
    const didSend = ownerPublicKey !== ownerPublicKeys[0];

    if (
      savedIds.has(Buffer.from(tokenTx.tokenTransactionHash).toString("hex"))
    ) {
      console.log("Transaction already saved");
      continue;
    }

    const tx = {
      id: Buffer.from(tokenTx.tokenTransactionHash).toString("hex"),
      paymentStatus: "completed",
      paymentType: "spark",
      accountId: ownerPublicKeys[0],
      details: {
        fee: 0,
        amount: amount,
        address: sparkAddress,
        time: new Date(
          tokenTx.tokenTransaction.clientCreatedTimestamp
        ).getTime(),
        direction: didSend ? "OUTGOING" : "INCOMING",
        description: "",
        isLRC20Payment: true,
        LRC20Token: tokenbech32m,
      },
    };

    newTxs.push(tx);
  }

  Storage.setItem("lastRunLRC20Tokens", Date.now());

  await bulkUpdateSparkTransactions(newTxs, "fullUpdate");
}
