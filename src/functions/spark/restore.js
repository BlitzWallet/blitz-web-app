import {
  findTransactionTxFromTxHistory,
  getCachedSparkTransactions,
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentStatus,
  getSparkLightningSendRequest,
  getSparkPaymentStatus,
  getSparkTransactions,
  sparkPaymentType,
} from ".";
import { SparkCoopExitRequestStatus } from "@buildonspark/spark-sdk/types";
import Storage from "../localStorage";
import {
  bulkUpdateSparkTransactions,
  deleteSparkTransaction,
  deleteUnpaidSparkLightningTransaction,
  getAllPendingSparkPayments,
  getAllUnpaidSparkLightningInvoices,
} from "./transactions";
import { transformTxToPaymentObject } from "./transformTxToPayment";
import {
  IS_BITCOIN_REQUEST_ID,
  IS_SPARK_ID,
  IS_SPARK_REQUEST_ID,
} from "../../constants";

export const restoreSparkTxState = async (
  BATCH_SIZE,
  savedTxs,
  isSendingPayment,
  mnemonic,
  accountId
) => {
  const restoredTxs = [];

  try {
    const savedIds = new Set(savedTxs?.map((tx) => tx.sparkID) || []);
    const pendingTxs = await getAllPendingSparkPayments(accountId);

    const txsByType = {
      lightning: pendingTxs.filter((tx) => tx.paymentType === "lightning"),
      bitcoin: pendingTxs.filter((tx) => tx.paymentType === "bitcoin"),
    };

    let offset = 0;
    let localBatchSize = !savedIds.size ? 100 : BATCH_SIZE;
    const donationPubKey = process.env.BLITZ_SPARK_PUBLICKEY;

    while (true) {
      const txs = await getSparkTransactions(localBatchSize, offset, mnemonic);
      const batchTxs = txs.transfers || [];

      if (!batchTxs.length) {
        console.log("No more transactions found, ending restore.");
        break;
      }

      // Process batch and check for overlap simultaneously
      let foundOverlap = false;
      const newBatchTxs = [];
      for (const tx of batchTxs) {
        // Check for overlap first (most likely to break early)
        if (savedIds.has(tx.id)) {
          foundOverlap = true;
          console.log(
            "Found overlap with saved transactions, stopping restore."
          );
          break;
        }

        // Filter out donation payments while processing
        if (
          tx.transferDirection === "OUTGOING" &&
          tx.receiverIdentityPublicKey === donationPubKey
        ) {
          continue;
        }

        // This would cause a double transaction to be listed untill the pending items were clear
        if (tx.transferDirection === "OUTGOING" && isSendingPayment) continue;

        const type = sparkPaymentType(tx);

        if (type === "bitcoin") {
          const response = txsByType.bitcoin.find((item) => {
            const details = JSON.parse(item.details);
            return (
              tx.transferDirection === details.direction &&
              tx.totalValue === details.amount &&
              details.time - new Date(tx.createdTime) < 1000 * 60 * 10
            );
          });

          if (response) continue;
        } else if (type === "lightning") {
          const response = txsByType.lightning.find((item) => {
            const details = JSON.parse(item.details);
            return (
              tx.transferDirection === details.direction &&
              details?.createdAt - new Date(tx.createdTime) < 1000 * 30
            );
          });

          if (response) continue;
        }

        newBatchTxs.push(tx);
      }

      // Add filtered transactions to result
      restoredTxs.push(...newBatchTxs);

      if (foundOverlap) {
        break;
      }

      offset += localBatchSize;
    }

    console.log(`Total restored transactions: ${restoredTxs.length}`);

    return { txs: restoredTxs };
  } catch (error) {
    console.error("Error in spark restore history state:", error);
    return { txs: [] };
  }
};

// Helper function to split array into chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Process a single chunk of transactions
async function processTransactionChunk(
  txChunk,
  sparkAddress,
  unpaidInvoices,
  identityPubKey,
  numberOfRestoredTxs
) {
  const chunkPaymentObjects = [];

  for (const tx of txChunk) {
    try {
      const paymentObject = await transformTxToPaymentObject(
        tx,
        sparkAddress,
        undefined,
        true,
        unpaidInvoices,
        identityPubKey,
        numberOfRestoredTxs
      );
      if (paymentObject) {
        chunkPaymentObjects.push(paymentObject);
      }
    } catch (err) {
      console.error("Error transforming tx:", tx.id, err);
    }
  }

  return chunkPaymentObjects;
}

export async function fullRestoreSparkState({
  sparkAddress,
  batchSize = 50,
  chunkSize = 100,
  maxConcurrentChunks = 3, // Reduced for better responsiveness
  yieldInterval = 50, // Yield every N milliseconds
  onProgress = null, // Optional progress callback
  isSendingPayment,
  mnemonic,
  identityPubKey,
}) {
  try {
    console.log("running");
    const savedTxs = await getCachedSparkTransactions(null, identityPubKey);
    const restored = await restoreSparkTxState(
      batchSize,
      savedTxs,
      isSendingPayment,
      mnemonic,
      identityPubKey
    );

    const unpaidInvoices = await getAllUnpaidSparkLightningInvoices();
    const txChunks = chunkArray(restored.txs, chunkSize);

    console.log(
      `Processing ${restored.txs.length} transactions in ${txChunks.length} chunks`
    );

    const allPaymentObjects = [];
    let processedChunks = 0;

    // Process chunks in smaller batches with yields
    for (let i = 0; i < txChunks.length; i += maxConcurrentChunks) {
      const batchChunks = txChunks.slice(i, i + maxConcurrentChunks);

      // Process this batch of chunks in parallel
      const chunkPromises = batchChunks.map((chunk) =>
        processTransactionChunk(
          chunk,
          sparkAddress,
          unpaidInvoices,
          identityPubKey,
          restored.txs.length
        )
      );

      try {
        const batchResults = await Promise.all(chunkPromises);
        allPaymentObjects.push(...batchResults.flat());
        processedChunks += batchChunks.length;

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            processed: processedChunks,
            total: txChunks.length,
            percentage: Math.round((processedChunks / txChunks.length) * 100),
          });
        }

        console.log(`Processed ${processedChunks}/${txChunks.length} chunks`);

        // Yield control back to main thread between batches
        if (i + maxConcurrentChunks < txChunks.length) {
          await new Promise((resolve) => setTimeout(resolve, yieldInterval));
        }
      } catch (err) {
        console.error("Error processing chunk batch:", err);
      }
    }

    console.log(
      `Transformed ${allPaymentObjects.length}/${restored.txs.length} transactions`
    );

    if (allPaymentObjects.length) {
      bulkUpdateSparkTransactions(allPaymentObjects, "fullUpdate");
    }

    return allPaymentObjects.length;
  } catch (err) {
    console.log("full restore spark state error", err);
    return false;
  }
}

export const findSignleTxFromHistory = async (txid, BATCH_SIZE, mnemonic) => {
  let restoredTx;
  try {
    // here we do not want to save any tx to be shown, we only want to flag that it came from restore and then when we get the actual notification of it we can block the navigation
    let start = 0;

    let foundOverlap = false;

    do {
      const txs = await getSparkTransactions(
        start + BATCH_SIZE,
        start,
        mnemonic
      );
      const batchTxs = txs.transfers || [];

      if (!batchTxs.length) {
        console.log("No more transactions found, ending restore.");
        break;
      }

      // Check for overlap with saved transactions
      const overlap = batchTxs.find((tx) => tx.id === txid);

      if (overlap) {
        console.log("Found overlap with saved transactions, stopping restore.");
        foundOverlap = true;
        restoredTx = overlap;
      }

      start += BATCH_SIZE;
    } while (!foundOverlap);

    // Filter out any already-saved txs or dontation payments
    console.log(`Restored transaction`, restoredTx);

    return { tx: restoredTx };
  } catch (error) {
    console.error("Error in spark restore history state:", error);
    return { tx: null };
  }
};
let isUpdatingSparkTxStatus = false;

export const updateSparkTxStatus = async (mnemoninc, accountId) => {
  try {
    if (isUpdatingSparkTxStatus) {
      console.log("updateSparkTxStatus skipped: already running");
      return;
    }
    isUpdatingSparkTxStatus = true;
    // Get all saved transactions
    console.log("running pending payments");
    const savedTxs = await getAllPendingSparkPayments(accountId);

    if (!savedTxs.length) return { updated: [] };
    const txsByType = {
      lightning: savedTxs.filter((tx) => tx.paymentType === "lightning"),
      bitcoin: savedTxs.filter((tx) => tx.paymentType === "bitcoin"),
      spark: savedTxs.filter((tx) => tx.paymentType === "spark"),
    };

    const [unpaidInvoices] = await Promise.all([
      txsByType.lightning.length
        ? getAllUnpaidSparkLightningInvoices()
        : Promise.resolve([]),
    ]);

    const unpaidInvoicesByAmount = new Map();
    unpaidInvoices.forEach((invoice) => {
      const amount = invoice.amount;
      if (!unpaidInvoicesByAmount.has(amount)) {
        unpaidInvoicesByAmount.set(amount, []);
      }
      unpaidInvoicesByAmount.get(amount).push(invoice);
    });

    console.log("pending tx list", savedTxs);

    // Process different transaction types in parallel
    const [lightningUpdates, bitcoinUpdates, sparkUpdates] = await Promise.all([
      processLightningTransactions(
        txsByType.lightning,
        unpaidInvoicesByAmount,
        mnemoninc
      ),
      processBitcoinTransactions(txsByType.bitcoin, mnemoninc),
      processSparkTransactions(txsByType.spark),
    ]);

    const updatedTxs = [
      ...lightningUpdates,
      ...bitcoinUpdates,
      ...sparkUpdates,
    ];

    if (!updatedTxs.length) return { updated: [] };

    await bulkUpdateSparkTransactions(updatedTxs, "restoreTxs");
    console.log(`Updated transactions:`, updatedTxs);
    return { updated: updatedTxs };
  } catch (error) {
    console.error("Error in spark restore:", error);
    return { updated: [] };
  } finally {
    isUpdatingSparkTxStatus = false;
  }
};

async function processLightningTransactions(
  lightningTxs,
  unpaidInvoicesByAmount,
  mnemonic
) {
  const CONCURRENCY_LIMIT = 5;
  const updatedTxs = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < lightningTxs.length; i += CONCURRENCY_LIMIT) {
    const batch = lightningTxs.slice(i, i + CONCURRENCY_LIMIT);

    const batchPromises = batch.map((tx) =>
      processLightningTransaction(tx, unpaidInvoicesByAmount, mnemonic).catch(
        (err) => {
          console.error("Error processing lightning tx:", tx.sparkID, err);
          return null;
        }
      )
    );

    const results = await Promise.all(batchPromises);
    const validResults = results.filter(Boolean);
    updatedTxs.push(...validResults);
  }

  let newTxs = [];

  let transfersOffset = 0;
  let cachedTransfers = [];

  for (const result of updatedTxs) {
    if (!result.lookThroughTxHistory) {
      newTxs.push(result);
      continue;
    }

    const findTxResponse = await findTransactionTxFromTxHistory(
      result.id,
      transfersOffset,
      cachedTransfers,
      mnemonic
    );

    if (findTxResponse.offset && findTxResponse.foundTransfers) {
      transfersOffset = findTxResponse.offset;
      cachedTransfers = findTxResponse.foundTransfers;
    }

    if (!findTxResponse.didWork || !findTxResponse.bitcoinTransfer) continue;

    const { offset, foundTransfers, bitcoinTransfer } = findTxResponse;
    transfersOffset = offset;
    cachedTransfers = foundTransfers;

    if (!bitcoinTransfer) continue;

    const paymentStatus = getSparkPaymentStatus(bitcoinTransfer.status);
    const expiryDate = new Date(bitcoinTransfer.expiryTime);

    if (paymentStatus === "pending" && expiryDate < Date.now()) {
      await deleteSparkTransaction(result.id);
      continue;
    }

    newTxs.push({
      ...result,
      paymentStatus: getSparkPaymentStatus(bitcoinTransfer.status),
      details: {
        amount: bitcoinTransfer.totalValue,
        direction: bitcoinTransfer.transferDirection,
        preimage: "",
        address: "",
      },
    });
  }

  return newTxs;
}

async function processLightningTransaction(
  txStateUpdate,
  unpaidInvoicesByAmount,
  mnemonic
) {
  const details = JSON.parse(txStateUpdate.details);

  if (txStateUpdate.paymentType === "lightning") {
    const possibleOptions = unpaidInvoicesByAmount.get(details.amount) || [];

    if (
      !IS_SPARK_REQUEST_ID.test(txStateUpdate.sparkID) &&
      !possibleOptions.length
    ) {
      return {
        id: txStateUpdate.sparkID,
        paymentStatus: "",
        paymentType: "lightning",
        accountId: txStateUpdate.accountId,
        lookThroughTxHistory: true,
      };
    }

    if (!IS_SPARK_REQUEST_ID.test(txStateUpdate.sparkID)) {
      // Process invoice matching with retry logic
      const matchResult = await findMatchingInvoice(
        possibleOptions,
        txStateUpdate.sparkID,
        mnemonic
      );

      if (matchResult.savedInvoice) {
        await deleteUnpaidSparkLightningTransaction(
          matchResult.savedInvoice.sparkID
        );
      }

      const savedDetails = matchResult.savedInvoice?.details
        ? JSON.parse(matchResult.savedInvoice.details)
        : {};

      return {
        useTempId: true,
        tempId: txStateUpdate.sparkID,
        id: matchResult.matchedUnpaidInvoice
          ? matchResult.matchedUnpaidInvoice.transfer.sparkId
          : txStateUpdate.sparkID,
        paymentStatus: "completed",
        // getSparkPaymentStatus(
        //   matchResult.matchedUnpaidInvoice.status,
        // ),
        paymentType: "lightning",
        accountId: txStateUpdate.accountId,
        details: {
          ...savedDetails,
          description: matchResult.savedInvoice?.description || "",
          address:
            matchResult.matchedUnpaidInvoice?.invoice?.encodedInvoice || "",
          preimage: matchResult.matchedUnpaidInvoice?.paymentPreimage || "",
          shouldNavigate: matchResult.savedInvoice?.shouldNavigate ?? 0,
          isLNURL: savedDetails?.isLNURL || false,
        },
      };
    }

    // Handle spark request IDs
    const sparkResponse =
      details.direction === "INCOMING"
        ? await getSparkLightningPaymentStatus({
            lightningInvoiceId: txStateUpdate.sparkID,
            mnemonic,
          })
        : await getSparkLightningSendRequest(txStateUpdate.sparkID, mnemonic);

    if (
      details.direction === "OUTGOING" &&
      getSparkPaymentStatus(sparkResponse.status) === "failed"
    )
      return {
        ...txStateUpdate,
        id: txStateUpdate.sparkID,
        details: {
          ...details,
        },
        paymentStatus: "failed",
      };

    if (!sparkResponse?.transfer) return null;
    return {
      useTempId: true,
      tempId: txStateUpdate.sparkID,
      id: sparkResponse.transfer.sparkId,
      paymentStatus: "completed", // getSparkPaymentStatus(sparkResponse.status)
      paymentType: "lightning",
      accountId: txStateUpdate.accountId,
      details: {
        ...details,
        preimage: sparkResponse.paymentPreimage || "",
      },
    };
  }

  return null;
}

async function findMatchingInvoice(possibleOptions, sparkID, mnemonic) {
  const BATCH_SIZE = 3;

  for (let i = 0; i < possibleOptions.length; i += BATCH_SIZE) {
    const batch = possibleOptions.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (invoice) => {
      const paymentDetails = await getPaymentDetailsWithRetry(
        invoice.sparkID,
        undefined,
        mnemonic
      );
      if (paymentDetails?.transfer?.sparkId === sparkID) {
        return { invoice, paymentDetails };
      }
      return null;
    });

    const results = await Promise.all(batchPromises);
    const match = results.find((result) => result !== null);

    if (match) {
      return {
        savedInvoice: match.invoice,
        matchedUnpaidInvoice: match.paymentDetails,
      };
    }
  }

  return { savedInvoice: null, matchedUnpaidInvoice: null };
}

async function getPaymentDetailsWithRetry(
  lightningInvoiceId,
  maxAttempts = 2,
  mnemonic
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await getSparkLightningPaymentStatus({
        lightningInvoiceId,
        mnemonic,
      });
      if (result?.transfer !== undefined) {
        return result;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return null;
}

async function processBitcoinTransactions(bitcoinTxs, mnemonic) {
  const lastRun = Storage.getItem("lastRunBitcoinTxUpdate");

  const now = Date.now();
  const cooldownPeriod = 1000 * 60; // 60 seconds
  let shouldBlockSendCheck = null;

  // if (lastRun && now - JSON.parse(lastRun) < cooldownPeriod) {
  //   console.log("Blocking bitcoin transaction processing");
  //   shouldBlockSendCheck = true;
  // } else {
  //   console.log("Updating bitcoin transaction processing last run time");
  //   shouldBlockSendCheck = false;
  //   Storage.setItem("lastRunBitcoinTxUpdate", now);
  // }
  const updatedTxs = [];
  let transfersOffset = 0;
  let cachedTransfers = [];

  for (const txStateUpdate of bitcoinTxs) {
    const details = JSON.parse(txStateUpdate.details);

    if (
      details.direction === "INCOMING" ||
      !IS_BITCOIN_REQUEST_ID.test(txStateUpdate.sparkID)
    ) {
      if (!IS_SPARK_ID.test(txStateUpdate.sparkID)) continue;

      const findTxResponse = await findTransactionTxFromTxHistory(
        txStateUpdate.sparkID,
        transfersOffset,
        cachedTransfers,
        mnemonic
      );

      if (findTxResponse.offset && findTxResponse.foundTransfers) {
        transfersOffset = findTxResponse.offset;
        cachedTransfers = findTxResponse.foundTransfers;
      }

      if (!findTxResponse.didWork || !findTxResponse.bitcoinTransfer) continue;

      const { offset, foundTransfers, bitcoinTransfer } = findTxResponse;
      transfersOffset = offset;
      cachedTransfers = foundTransfers;

      if (!bitcoinTransfer) continue;

      updatedTxs.push({
        id: txStateUpdate.sparkID,
        paymentStatus: getSparkPaymentStatus(bitcoinTransfer.status),
        paymentType: "bitcoin",
        accountId: txStateUpdate.accountId,
      });
    } else {
      if (shouldBlockSendCheck) continue;
      const sparkResponse = await getSparkBitcoinPaymentRequest(
        txStateUpdate.sparkID,
        mnemonic
      );

      if (!sparkResponse?.transfer) {
        if (
          sparkResponse?.coopExitTxid &&
          (!details.onChainTxid || !details.expiresAt)
        ) {
          updatedTxs.push({
            useTempId: true,
            tempId: txStateUpdate.sparkID,
            id: txStateUpdate.sparkID,
            paymentStatus: "pending",
            paymentType: "bitcoin",
            accountId: txStateUpdate.accountId,
            details: {
              ...details,
              onChainTxid: sparkResponse.coopExitTxid,
              expiresAt: sparkResponse.expiresAt || "",
            },
          });
        }

        if (
          sparkResponse.status === SparkCoopExitRequestStatus.EXPIRED ||
          sparkResponse.status === SparkCoopExitRequestStatus.FAILED
        ) {
          updatedTxs.push({
            id: txStateUpdate.sparkID,
            paymentStatus: "failed",
            paymentType: "bitcoin",
            accountId: txStateUpdate.accountId,
            details,
          });
        }
        continue;
      }

      updatedTxs.push({
        useTempId: true,
        tempId: txStateUpdate.sparkID,
        id: sparkResponse.transfer.sparkId,
        paymentStatus: "completed", // getSparkPaymentStatus(sparkResponse.status)
        paymentType: "bitcoin",
        accountId: txStateUpdate.accountId,
        details: {
          ...details,
          onChainTxid: sparkResponse.coopExitTxid,
        },
      });
    }
  }

  return updatedTxs;
}

async function processSparkTransactions(sparkTxs) {
  return sparkTxs.map((txStateUpdate) => ({
    id: txStateUpdate.sparkID,
    paymentStatus: "completed",
    paymentType: "spark",
    accountId: txStateUpdate.accountId,
  }));
}
