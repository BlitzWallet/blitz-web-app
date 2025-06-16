import { openDB, deleteDB } from "idb";
import EventEmitter from "events";

export const SPARK_TRANSACTIONS_DATABASE_NAME = "spark-info-db";
export const SPARK_TRANSACTIONS_TABLE_NAME = "SPARK_TRANSACTIONS";
export const LIGHTNING_REQUEST_IDS_TABLE_NAME = "LIGHTNING_REQUEST_IDS";
export const sparkTransactionsEventEmitter = new EventEmitter();
export const SPARK_TX_UPDATE_ENVENT_NAME = "UPDATE_SPARK_STATE";

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

export const getAllSparkTransactions = async () => {
  try {
    const db = await dbPromise;
    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);
    return all.sort(
      (a, b) => JSON.parse(b.details).time - JSON.parse(a.details).time
    );
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
    sparkTransactionsEventEmitter.emit(
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions"
    );
    return true;
  } catch (err) {
    console.error("updateSingleSparkTransaction error:", err);
    return false;
  }
};

export const bulkUpdateSparkTransactions = async (transactions) => {
  try {
    const db = await dbPromise;
    const tx = db.transaction([SPARK_TRANSACTIONS_TABLE_NAME], "readwrite");
    const store = tx.objectStore(SPARK_TRANSACTIONS_TABLE_NAME);
    for (const t of transactions) {
      const tempSparkId = t.useTempId ? t.tempId : t.id;
      const finalSparkId = t.id;
      const newDetails = t.details;

      const existing = await store.get(tempSparkId);

      if (existing) {
        let mergedDetails = {};
        try {
          mergedDetails = { ...JSON.parse(existing.details), ...newDetails };
        } catch {
          mergedDetails = JSON.parse(existing.details);
        }

        await store.put({
          ...existing,
          sparkID: t.id,
          paymentStatus: t.paymentStatus,
          paymentType: t.paymentType ?? "unknown",
          accountId: t.accountId ?? "unknown",
          details: JSON.stringify(mergedDetails),
        });
        // If the ID changed, delete the old temp entry to avoid duplicates
        if (finalSparkId !== tempSparkId) {
          await store.delete(tempSparkId);
        }
      } else {
        await store.put({
          sparkID: t.id,
          paymentStatus: t.paymentStatus,
          paymentType: t.paymentType ?? "unknown",
          accountId: t.accountId ?? "unknown",
          details: JSON.stringify(newDetails),
        });
      }
    }
    await tx.done;

    sparkTransactionsEventEmitter.emit(
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions"
    );
    return true;
  } catch (err) {
    console.error("bulkUpdateSparkTransactions error:", err);
    return false;
  }
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
    sparkTransactionsEventEmitter.emit(
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions"
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
    sparkTransactionsEventEmitter.emit(
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
