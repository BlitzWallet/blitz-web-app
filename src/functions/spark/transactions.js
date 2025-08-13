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

export const getAllSparkTransactions = async (limit = null) => {
  try {
    const db = await dbPromise;
    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);
    const sorted = all.sort(
      (a, b) => JSON.parse(b.details).time - JSON.parse(a.details).time
    );
    if (limit) {
      return sorted.slice(0, limit);
    }
    return sorted;
  } catch (err) {
    console.error("getAllSparkTransactions error:", err);
    return [];
  }
};

export const getAllPendingSparkPayments = async () => {
  try {
    const db = await dbPromise;
    return await db.getAllFromIndex(
      SPARK_TRANSACTIONS_TABLE_NAME,
      "paymentStatus",
      "pending"
    );
  } catch (err) {
    console.error("getAllPendingSparkPayments error:", err);
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

export const updateSingleSparkTransaction = async (sparkID, updates) => {
  try {
    const db = await dbPromise;
    const existing = await db.get(SPARK_TRANSACTIONS_TABLE_NAME, sparkID);
    if (!existing) return false;
    const updated = { ...existing, ...updates };
    await db.put(SPARK_TRANSACTIONS_TABLE_NAME, updated);

    await new Promise((res) => setTimeout(res, 1000));
    handleEventEmitterPost(
      sparkTransactionsEventEmitter,
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions"
    );

    return true;
  } catch (err) {
    console.error("updateSingleSparkTransaction error:", err);
    return false;
  }
};

export const bulkUpdateSparkTransactions = async (transactions, ...data) => {
  const [updateType = "transactions", fee = 0, passedBalance = 0] = data;
  console.log(transactions, "transactions list in bulk updates");
  if (!Array.isArray(transactions) || transactions.length === 0) return;

  return addToBulkUpdateQueue(async () => {
    try {
      console.log("Running bulk updates", updateType);
      const db = await dbPromise;
      const tx = db.transaction([SPARK_TRANSACTIONS_TABLE_NAME], "readwrite");
      const store = tx.objectStore(SPARK_TRANSACTIONS_TABLE_NAME);

      const processedTransactions = new Map();

      for (const t of transactions) {
        const finalSparkId = t.id;
        const tempSparkId = t.useTempId ? t.tempId : t.id;

        if (processedTransactions.has(finalSparkId)) {
          const existingTx = processedTransactions.get(finalSparkId);
          const mergedDetails = { ...existingTx.details };

          for (const key in t.details) {
            const value = t.details[key];
            if (
              value !== "" &&
              value !== null &&
              value !== undefined &&
              value !== 0
            ) {
              mergedDetails[key] = value;
            }
          }
          processedTransactions.set(finalSparkId, {
            sparkID: finalSparkId,
            tempSparkId: existingTx.tempSparkId || tempSparkId,
            paymentStatus: t.paymentStatus || existingTx.paymentStatus,
            paymentType: t.paymentType || existingTx.paymentType || "unknown",
            accountId: t.accountId || existingTx.accountId || "unknown",
            details: mergedDetails,
            useTempId: t.useTempId || existingTx.useTempId,
          });
        } else {
          processedTransactions.set(finalSparkId, {
            sparkID: finalSparkId,
            tempSparkId: t.useTempId ? tempSparkId : null,
            paymentStatus: t.paymentStatus,
            paymentType: t.paymentType || "unknown",
            accountId: t.accountId || "unknown",
            details: t.details,
            useTempId: t.useTempId,
          });
        }
      }

      for (const [
        finalSparkId,
        processedTx,
      ] of processedTransactions.entries()) {
        const existingTx = await store.get(finalSparkId);
        let existingTempTx = null;
        if (
          processedTx.tempSparkId &&
          processedTx.tempSparkId !== finalSparkId
        ) {
          existingTempTx = await store.get(processedTx.tempSparkId);
        }

        const mergeDetails = (existingDetails = {}, newDetails = {}) => {
          const merged = { ...existingDetails };
          for (const key in newDetails) {
            const value = newDetails[key];
            if (
              value !== "" &&
              value !== null &&
              value !== undefined &&
              value !== 0
            ) {
              merged[key] = value;
            }
          }
          return merged;
        };

        if (existingTx) {
          let mergedDetails = {};
          try {
            mergedDetails = mergeDetails(
              JSON.parse(existingTx.details),
              processedTx.details
            );
          } catch {
            mergedDetails = processedTx.details;
          }

          await store.put({
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: JSON.stringify(mergedDetails),
          });

          if (existingTempTx && processedTx.tempSparkId !== finalSparkId) {
            await store.delete(processedTx.tempSparkId);
          }
        } else if (existingTempTx) {
          let mergedDetails = {};
          try {
            mergedDetails = mergeDetails(
              JSON.parse(existingTempTx.details),
              processedTx.details
            );
          } catch {
            mergedDetails = processedTx.details;
          }

          await store.put({
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: JSON.stringify(mergedDetails),
          });

          if (processedTx.tempSparkId !== finalSparkId) {
            await store.delete(processedTx.tempSparkId);
          }
        } else {
          await store.put({
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: JSON.stringify(processedTx.details),
          });
        }
      }

      await tx.done;
      await new Promise((res) => setTimeout(res, 1000));
      handleEventEmitterPost(
        sparkTransactionsEventEmitter,
        SPARK_TX_UPDATE_ENVENT_NAME,
        updateType,
        fee,
        passedBalance
      );

      return true;
    } catch (err) {
      console.error("bulkUpdateSparkTransactions error:", err);
      return false;
    }
  });
};

export const addSingleSparkTransaction = async (tx) => {
  try {
    const db = await dbPromise;
    await db.put(SPARK_TRANSACTIONS_TABLE_NAME, {
      sparkID: tx.id,
      paymentStatus: tx.paymentStatus,
      paymentType: tx.paymentType ?? "unknown",
      accountId: tx.accountId ?? "unknown",
      details: JSON.stringify(tx.details),
    });
    await new Promise((res) => setTimeout(res, 1000));
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
    await new Promise((res) => setTimeout(res, 1000));
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
