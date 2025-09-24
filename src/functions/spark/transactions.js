import { openDB, deleteDB } from "idb";
import EventEmitter from "events";

export const SPARK_TRANSACTIONS_DATABASE_NAME = "spark-info-db";
export const SPARK_TRANSACTIONS_TABLE_NAME = "SPARK_TRANSACTIONS";
export const LIGHTNING_REQUEST_IDS_TABLE_NAME = "LIGHTNING_REQUEST_IDS";
export const sparkTransactionsEventEmitter = new EventEmitter();
export const SPARK_TX_UPDATE_ENVENT_NAME = "UPDATE_SPARK_STATE";
let bulkUpdateTransactionQueue = [];
let isProcessingBulkUpdate = false;

let dbPromise = openDB(SPARK_TRANSACTIONS_DATABASE_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(SPARK_TRANSACTIONS_TABLE_NAME)) {
      const txStore = db.createObjectStore(SPARK_TRANSACTIONS_TABLE_NAME, {
        keyPath: "sparkID",
      });
      txStore.createIndex("paymentStatus", "paymentStatus");
    }
    if (!db.objectStoreNames.contains(LIGHTNING_REQUEST_IDS_TABLE_NAME)) {
      db.createObjectStore(LIGHTNING_REQUEST_IDS_TABLE_NAME, {
        keyPath: "sparkID",
      });
    }
  },
});

export const initializeSparkDatabase = async () => {
  try {
    await dbPromise;
    return true;
  } catch (err) {
    console.error("Database initialization failed:", err);
    return false;
  }
};

// Helper: safely parse/normalize details to an object.
const parseDetails = (details) => {
  if (details === null || details === undefined || details === "") return {};

  // If already an object (IDB may store structured objects), return as-is
  if (typeof details === "object") return JSON.stringify(details);
  else return details;
};

export const getAllSparkTransactions = async (limit = null, accountId) => {
  try {
    const db = await dbPromise;
    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);

    // Filter by accountId if provided
    let filtered = all;
    if (accountId) {
      filtered = all.filter((transaction) => {
        return transaction.accountId === String(accountId);
      });
    }

    // Normalize details for all transactions (do not mutate DB records here)
    const normalized = filtered.map((tx) => ({
      ...tx,
      details: parseDetails(tx.details),
    }));

    // Sort by time (newest first). Use numeric fallback 0 when missing.
    const sorted = normalized.sort((a, b) => {
      const aTime = JSON.parse(a.details).time;
      const bTime = JSON.parse(b.details).time;

      return bTime - aTime;
    });

    // Apply limit if provided
    if (limit) {
      return sorted.slice(0, limit);
    }

    return sorted;
  } catch (err) {
    console.error("getAllSparkTransactions error:", err);
    return [];
  }
};

export const getAllPendingSparkPayments = async (accountId) => {
  try {
    const db = await dbPromise;
    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);

    // Filter by paymentStatus = 'pending'
    let filtered = all.filter(
      (transaction) => transaction.paymentStatus === "pending"
    );

    // Further filter by accountId if provided and valid
    if (accountId !== undefined && accountId !== null && accountId !== "") {
      filtered = filtered.filter(
        (transaction) => transaction.accountId === String(accountId)
      );
    }

    // Normalize details for all transactions (do not mutate DB records here)
    const normalized = filtered.map((tx) => ({
      ...tx,
      details: parseDetails(tx.details),
    }));

    return normalized || [];
  } catch (error) {
    console.error("Error fetching pending spark payments:", error);
    return [];
  }
};

export const getAllUnpaidSparkLightningInvoices = async () => {
  try {
    const db = await dbPromise;
    return await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);
  } catch (err) {
    console.error("getAllUnpaidSparkLightningInvoices error:", err);
    return [];
  }
};

export const addSingleUnpaidSparkLightningTransaction = async (tx) => {
  try {
    if (!tx || !tx.id) {
      console.error("Invalid transaction object");
      return false;
    }
    const db = await dbPromise;
    await db.put(LIGHTNING_REQUEST_IDS_TABLE_NAME, {
      sparkID: tx.id,
      amount: Number(tx.amount),
      expiration: tx.expiration,
      description: tx.description,
      shouldNavigate:
        tx.shouldNavigate || tx?.shouldNavigate === undefined ? 0 : 1,
      details: JSON.stringify(tx.details),
    });
    console.log("added single unpaid spark tx", tx);
    return true;
  } catch (err) {
    console.error("addSingleUnpaidSparkLightningTransaction error:", err);
    return false;
  }
};

// export const updateSingleSparkTransaction = async (sparkID, updates) => {
//   try {
//     const db = await dbPromise;
//     const existing = await db.get(SPARK_TRANSACTIONS_TABLE_NAME, sparkID);
//     if (!existing) return false;
//     const updated = { ...existing, ...updates };
//     await db.put(SPARK_TRANSACTIONS_TABLE_NAME, updated);

//     await new Promise((res) => setTimeout(res, 1000));
//     handleEventEmitterPost(
//       sparkTransactionsEventEmitter,
//       SPARK_TX_UPDATE_ENVENT_NAME,
//       "transactions"
//     );

//     return true;
//   } catch (err) {
//     console.error("updateSingleSparkTransaction error:", err);
//     return false;
//   }
// };

export const bulkUpdateSparkTransactions = async (transactions, ...data) => {
  const [updateType = "transactions", fee = 0, passedBalance = 0] = data;
  console.log(transactions, "transactions list in bulk updates");
  if (!Array.isArray(transactions) || transactions.length === 0) return;

  return addToBulkUpdateQueue(async () => {
    try {
      console.log("Running bulk updates", updateType);
      console.log(transactions);

      const db = await dbPromise;
      const tx = db.transaction(SPARK_TRANSACTIONS_TABLE_NAME, "readwrite");
      const store = tx.objectStore(SPARK_TRANSACTIONS_TABLE_NAME);

      // Step 1: Format and deduplicate transactions
      const processedTransactions = new Map();

      // First pass: collect and merge transactions by final sparkID
      for (const txData of transactions) {
        const finalSparkId = txData.id; // This is the final ID we want to use
        const accountId = txData.accountId;
        const tempSparkId = txData.useTempId ? txData.tempId : txData.id;
        const removeDuplicateKey = `${finalSparkId}_${accountId}`;

        if (processedTransactions.has(removeDuplicateKey)) {
          // Merge with existing transaction
          const existingTx = processedTransactions.get(removeDuplicateKey);
          // Merge details - only override if new value is not empty
          let mergedDetails = { ...existingTx.details };
          for (const key in txData.details) {
            const value = txData.details[key];
            if (
              value !== "" &&
              value !== null &&
              value !== undefined &&
              value !== 0
            ) {
              mergedDetails[key] = value;
            }
          }
          console.log("Existing details", existingTx.details);
          console.log("merged detials", mergedDetails);

          // Update the transaction with merged data
          processedTransactions.set(removeDuplicateKey, {
            sparkID: finalSparkId,
            tempSparkId: existingTx.tempSparkId || tempSparkId, // Keep track of temp ID if it exists
            paymentStatus: txData.paymentStatus || existingTx.paymentStatus,
            paymentType:
              txData.paymentType || existingTx.paymentType || "unknown",
            accountId: txData.accountId || existingTx.accountId || "unknown",
            details: mergedDetails,
            useTempId: txData.useTempId || existingTx.useTempId,
          });
        } else {
          // Add new transaction
          processedTransactions.set(removeDuplicateKey, {
            sparkID: finalSparkId,
            tempSparkId: txData.useTempId ? tempSparkId : null,
            paymentStatus: txData.paymentStatus,
            paymentType: txData.paymentType || "unknown",
            accountId: txData.accountId || "unknown",
            details: txData.details,
            useTempId: txData.useTempId,
          });
        }
      }

      let includedFailed = false;

      // Step 2: Process each unique transaction
      for (const [removeDuplicateKey, processedTx] of processedTransactions) {
        const [finalSparkId, accountId] = removeDuplicateKey.split("_");

        // Check if transaction exists by final sparkID
        const allTransactions = await store.getAll();
        const existingTx = allTransactions.find(
          (tx) => tx.sparkID === finalSparkId && tx.accountId === accountId
        );

        // Also check if temp ID exists (if different from final ID)
        let existingTempTx = null;
        if (
          processedTx.tempSparkId &&
          processedTx.tempSparkId !== finalSparkId
        ) {
          existingTempTx = allTransactions.find(
            (tx) =>
              tx.sparkID === processedTx.tempSparkId &&
              tx.accountId === accountId
          );
        }

        if (existingTx) {
          // If new payment status is "failed", delete the existing payment
          if (processedTx.paymentStatus === "failed") {
            includedFailed = true;
            await store.delete(finalSparkId);

            // Also delete temp transaction if it exists and is different
            if (existingTempTx && processedTx.tempSparkId !== finalSparkId) {
              await store.delete(processedTx.tempSparkId);
            }
          } else {
            // Update existing transaction with final ID
            let existingDetails;
            try {
              existingDetails =
                typeof existingTx.details === "string"
                  ? JSON.parse(existingTx.details)
                  : existingTx.details;
            } catch {
              existingDetails = {};
            }

            let mergedDetails = { ...existingDetails };
            for (const key in processedTx.details) {
              const value = processedTx.details[key];
              if (
                value !== "" &&
                value !== null &&
                value !== undefined &&
                value !== 0
              ) {
                mergedDetails[key] = value;
              }
            }

            const updatedTx = {
              ...existingTx,
              paymentStatus: processedTx.paymentStatus,
              paymentType: processedTx.paymentType,
              accountId: processedTx.accountId,
              // Always store details as a JSON string for consistency
              details: JSON.stringify(mergedDetails),
            };

            await store.put(updatedTx);

            // Delete temp transaction if it exists and is different
            if (existingTempTx && processedTx.tempSparkId !== finalSparkId) {
              await store.delete(processedTx.tempSparkId);
            }
          }
        } else if (existingTempTx) {
          // If new payment status is "failed", delete the existing temp payment
          if (processedTx.paymentStatus === "failed") {
            includedFailed = true;
            await store.delete(processedTx.tempSparkId);
          } else {
            // Update temp transaction to use final sparkID
            let existingDetails;
            try {
              existingDetails =
                typeof existingTempTx.details === "string"
                  ? JSON.parse(existingTempTx.details)
                  : existingTempTx.details;
            } catch {
              existingDetails = {};
            }

            let mergedDetails = { ...existingDetails };
            for (const key in processedTx.details) {
              const value = processedTx.details[key];
              if (
                value !== "" &&
                value !== null &&
                value !== undefined &&
                value !== 0
              ) {
                mergedDetails[key] = value;
              }
            }

            const updatedTx = {
              ...existingTempTx,
              sparkID: finalSparkId,
              paymentStatus: processedTx.paymentStatus,
              paymentType: processedTx.paymentType,
              accountId: processedTx.accountId,
              // Always store details as a JSON string for consistency
              details: JSON.stringify(mergedDetails),
            };

            await store.put(updatedTx);
            await store.delete(existingTempTx.sparkID);
          }
        } else {
          // Only insert new transaction if payment status is not "failed"
          if (processedTx.paymentStatus !== "failed") {
            const newTx = {
              sparkID: finalSparkId,
              paymentStatus: processedTx.paymentStatus,
              paymentType: processedTx.paymentType,
              accountId: processedTx.accountId,
              // Ensure new transactions store details as a JSON string
              details: JSON.stringify(processedTx.details),
            };

            await store.add(newTx);
          } else {
            includedFailed = true;
          }
        }
      }

      // Wait for transaction to complete
      await tx.done;

      console.log("committing transactions");
      console.log("running sql event emitter");
      handleEventEmitterPost(
        sparkTransactionsEventEmitter,
        SPARK_TX_UPDATE_ENVENT_NAME,
        includedFailed ? "fullUpdate" : updateType,
        fee,
        passedBalance
      );

      return true;
    } catch (error) {
      console.error("Error upserting transactions batch:", error);
      return false;
    }
  });
};

export const addSingleSparkTransaction = async (tx) => {
  try {
    if (!tx || !tx.id) {
      console.error("Invalid transaction object");
      return false;
    }
    const db = await dbPromise;
    await db.put(SPARK_TRANSACTIONS_TABLE_NAME, {
      sparkID: tx.id,
      paymentStatus: tx.paymentStatus,
      paymentType: tx.paymentType ?? "unknown",
      accountId: tx.accountId ?? "unknown",
      details: JSON.stringify(tx.details),
    });

    handleEventEmitterPost(
      sparkTransactionsEventEmitter,
      SPARK_TX_UPDATE_ENVENT_NAME,
      "fullUpdate"
    );

    return true;
  } catch (err) {
    console.error("addSingleSparkTransaction error:", err);
    return false;
  }
};

export const deleteSparkTransaction = async (sparkID) => {
  try {
    const db = await dbPromise;
    await db.delete(SPARK_TRANSACTIONS_TABLE_NAME, sparkID);

    handleEventEmitterPost(
      sparkTransactionsEventEmitter,
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions"
    );

    return true;
  } catch (err) {
    console.error("deleteSparkTransaction error:", err);
    return false;
  }
};

export const deleteUnpaidSparkLightningTransaction = async (sparkID) => {
  try {
    const db = await dbPromise;
    await db.delete(LIGHTNING_REQUEST_IDS_TABLE_NAME, sparkID);
    return true;
  } catch (err) {
    console.error("deleteUnpaidSparkLightningTransaction error:", err);
    return false;
  }
};

export const deleteSparkTransactionTable = async () => {
  const db = await dbPromise;
  db.deleteObjectStore(SPARK_TRANSACTIONS_TABLE_NAME);
};

export const deleteUnpaidSparkLightningTransactionTable = async () => {
  const db = await dbPromise;
  db.deleteObjectStore(LIGHTNING_REQUEST_IDS_TABLE_NAME);
};

export const wipeEntireSparkDatabase = async () => {
  try {
    await deleteDB(SPARK_TRANSACTIONS_DATABASE_NAME);
    await deleteDB(LIGHTNING_REQUEST_IDS_TABLE_NAME);
    console.log("Spark DB deleted successfully");
    return true;
  } catch (err) {
    console.error("Failed to delete DB:", err);
    return false;
  }
};

export const cleanStalePendingSparkLightningTransactions = async () => {
  try {
    const db = await dbPromise;
    const all = await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);
    const now = Date.now();
    for (const tx of all) {
      if (tx.expiration && tx.expiration < now) {
        await db.delete(LIGHTNING_REQUEST_IDS_TABLE_NAME, tx.sparkID);
      }
    }
    return true;
  } catch (err) {
    console.error("cleanStalePendingSparkLightningTransactions error:", err);
    return false;
  }
};
const handleEventEmitterPost = (eventEmitter, eventName, ...eventParams) => {
  const maxAttempts = 30;
  const intervalMs = 2000;

  if (typeof eventEmitter.listenerCount !== "function") {
    console.log("Event emitter doesn't support listenerCount method");
    return;
  }

  const hasListeners = eventEmitter.listenerCount(eventName) > 0;

  console.log(hasListeners, "has listners");

  if (hasListeners) {
    console.log("Listeners found, emitting immediately");
    eventEmitter.emit(eventName, ...eventParams);
    return;
  }

  console.log("No listeners found, starting interval fallback");
  let attempts = 0;
  const intervalId = setInterval(() => {
    attempts++;

    if (attempts >= maxAttempts) {
      console.log(`Max fallback attempts (${maxAttempts}) reached`);
      clearInterval(intervalId);
      return;
    }

    console.log(`Fallback emit attempt ${attempts}`);
    try {
      const nowHasListeners = eventEmitter.listenerCount(eventName) > 0;
      if (nowHasListeners) {
        console.log("Listener detected, emitting event");
        eventEmitter.emit(eventName, ...eventParams);
        clearInterval(intervalId);
      }
    } catch (error) {
      console.error("Error during emit attempt:", error);
    }
  }, intervalMs);

  return intervalId; // Allow manual cleanup if needed
};

const addToBulkUpdateQueue = async (operation) => {
  return new Promise((resolve, reject) => {
    bulkUpdateTransactionQueue.push({ operation, resolve, reject });

    if (!isProcessingBulkUpdate) {
      processBulkUpdateQueue();
    }
  });
};

const processBulkUpdateQueue = async () => {
  if (isProcessingBulkUpdate || bulkUpdateTransactionQueue.length === 0) return;

  isProcessingBulkUpdate = true;

  while (bulkUpdateTransactionQueue.length > 0) {
    const { operation, resolve, reject } = bulkUpdateTransactionQueue.shift();

    try {
      const result = await operation();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  isProcessingBulkUpdate = false;
};
