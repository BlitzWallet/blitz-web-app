import { deleteDB, openDB } from "idb";
import Storage from "../localStorage";
import EventEmitter from "events";
import { decryptMessage } from "../encodingAndDecoding";
import { getTwoWeeksAgoDate } from "../rotateAddressDateChecker";

export const POS_TRANSACTION_TABLE_NAME = "POS_TRANSACTIONS";
export const POS_LAST_RECEIVED_TIME = "LAST_RECEIVED_POS_EVENT";
export const POS_EVENT_UPDATE = "POS_EVENT_UPDATE";
export const DID_OPEN_TABLES_EVENT_NAME = "DID_OPEN_POS_TABLES";
export const pointOfSaleEventEmitter = new EventEmitter();

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB("pos-transactions-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(POS_TRANSACTION_TABLE_NAME)) {
          const store = db.createObjectStore(POS_TRANSACTION_TABLE_NAME, {
            keyPath: "dbDateAdded",
          });
          store.createIndex("timestamp", "timestamp");
          store.createIndex("serverName", "serverName", { unique: false });
        }
      },
    });
  }
  return dbPromise;
};

export const initializePOSTransactionsDatabase = async () => {
  try {
    await getDB();
    pointOfSaleEventEmitter.emit(DID_OPEN_TABLES_EVENT_NAME, "opened");
    return true;
  } catch (err) {
    console.error(err);
    pointOfSaleEventEmitter.emit(DID_OPEN_TABLES_EVENT_NAME, "not opened");
    return false;
  }
};

export const getSavedPOSTransactions = async () => {
  try {
    const db = await getDB();
    const allTx = await db.getAllFromIndex(
      POS_TRANSACTION_TABLE_NAME,
      "timestamp",
    );
    const sortedTx = allTx.sort((a, b) => b.timestamp - a.timestamp);

    if (!sortedTx.length) return [];

    let newestTimestamp = sortedTx[0].timestamp;
    const savedNewestTime = Storage.getItem(POS_LAST_RECEIVED_TIME) || 0;
    const convertedTime = newestTimestamp || getTwoWeeksAgoDate();

    newestTimestamp = Math.max(savedNewestTime, convertedTime);
    return sortedTx;
  } catch (err) {
    console.error(err);
    return false;
  }
};

let messageQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (!messageQueue.length || isProcessing) return;
  isProcessing = true;
  while (messageQueue.length > 0) {
    const { transactionsList, privateKey } = messageQueue.shift();
    await setPOSTransactions({ transactionsList, privateKey });
  }
  isProcessing = false;
};

export const queuePOSTransactions = ({ transactionsList, privateKey }) => {
  messageQueue.push({ transactionsList, privateKey });
  if (messageQueue.length === 1) processQueue();
};

export const setPOSTransactions = async ({ transactionsList, privateKey }) => {
  try {
    const db = await getDB();
    const tx = db.transaction(POS_TRANSACTION_TABLE_NAME, "readwrite");

    for (const msg of transactionsList) {
      const decrypted = await decryptMessage(
        privateKey,
        import.meta.env.VITE_BACKEND_PUB_KEY,
        msg.tx,
      );
      if (!decrypted) continue;

      const parsed = JSON.parse(decrypted);
      await tx.store.put({
        tipAmountSats: parsed.tipAmountSats,
        orderAmountSats: parsed.orderAmountSats,
        serverName: parsed.serverName,
        timestamp: parsed.time,
        dbDateAdded: msg.dateAdded,
        didPay: 0,
      });
    }

    await tx.done;

    const latestTimestamp = transactionsList.sort(
      (a, b) => b.dateAdded - a.dateAdded,
    )[0].dateAdded;
    Storage.setItem(POS_LAST_RECEIVED_TIME, latestTimestamp);

    pointOfSaleEventEmitter.emit(POS_EVENT_UPDATE, "set pos transaction");
    return true;
  } catch (err) {
    console.error("setPOSTransactions error:", err);
    return false;
  }
};

export const bulkUpdateDidPay = async (dbDateAddedArray) => {
  if (!dbDateAddedArray?.length) return;

  try {
    const db = await getDB();
    const tx = db.transaction(POS_TRANSACTION_TABLE_NAME, "readwrite");

    for (const id of dbDateAddedArray) {
      const existing = await tx.store.get(id);
      if (existing) {
        existing.didPay = 1;
        await tx.store.put(existing);
      }
    }

    await tx.done;
    pointOfSaleEventEmitter.emit(POS_EVENT_UPDATE, "bulk updated did pay");
  } catch (err) {
    console.error("bulkUpdateDidPay error:", err);
  }
};

export const updateDidPayForSingleTx = async (didPaySetting, dbDateAdded) => {
  try {
    const db = await getDB();
    const tx = db.transaction(POS_TRANSACTION_TABLE_NAME, "readwrite");
    const item = await tx.store.get(dbDateAdded);
    if (item) {
      item.didPay = didPaySetting;
      await tx.store.put(item);
    }
    await tx.done;
    pointOfSaleEventEmitter.emit(
      POS_EVENT_UPDATE,
      "updated did pay for single tx",
    );
  } catch (err) {
    console.error("updateDidPayForSingleTx error:", err);
  }
};

export const deleteEmployee = async (employeeName) => {
  try {
    const db = await getDB();
    const tx = db.transaction(POS_TRANSACTION_TABLE_NAME, "readwrite");
    const all = await tx.store.getAll();

    for (const item of all) {
      if (item.serverName.toLowerCase() === employeeName.toLowerCase()) {
        await tx.store.delete(item.dbDateAdded);
      }
    }

    await tx.done;
    pointOfSaleEventEmitter.emit(POS_EVENT_UPDATE, "deleted employee");
    return true;
  } catch (err) {
    console.error("deleteEmployee error:", err);
    return false;
  }
};

export const deletePOSTransactionsTable = async () => {
  const db = await getDB();
  await db.deleteObjectStore(POS_TRANSACTION_TABLE_NAME);
  console.log(`Table ${POS_TRANSACTION_TABLE_NAME} deleted`);
};

export const wipeEntirePOSDatabase = async () => {
  try {
    await deleteDB(POS_TRANSACTION_TABLE_NAME);
    console.log("Spark DB deleted successfully");
    return true;
  } catch (err) {
    console.error("Failed to delete DB:", err);
    return false;
  }
};
