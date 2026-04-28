import { deleteDB, openDB } from "idb";
import Storage from "../localStorage";
import { getTwoWeeksAgoDate } from "../rotateAddressDateChecker";
import EventEmitter from "events";
import {
  addBulkUnpaidSparkContactTransactions,
  deleteBulkSparkContactTransactions,
  getAllSparkContactInvoices,
  getBulkSparkTransactions,
} from "../spark/transactions";
import i18next from "i18next";

export const CACHED_MESSAGES_KEY = "CASHED_CONTACTS_MESSAGES";
export const DB_NAME = `${CACHED_MESSAGES_KEY}`;
export const STORE_NAME_CONTACT_MESSAGES = "messagesTable";
export const LOCALSTORAGE_LAST_RECEIVED_TIME_KEY =
  "LAST_RECEIVED_CONTACT_MESSAGE";
export const CONTACTS_TRANSACTION_UPDATE_NAME = "RECEIVED_CONTACTS EVENT";
export const contactsSQLEventEmitter = new EventEmitter();

let dbPromise = null;
let messageQueue = [];
let isProcessing = false;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME_CONTACT_MESSAGES)) {
          const store = db.createObjectStore(STORE_NAME_CONTACT_MESSAGES, {
            keyPath: "messageUUID",
          });
          store.createIndex("contactPubKey", "contactPubKey");
          store.createIndex("timestamp", "timestamp");
        }
      },
    });
  }
  return dbPromise;
};

export const initializeDatabase = async () => {
  await getDB();
  console.log("didOPEN");
  return true;
};

export const getCachedMessages = async () => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME_CONTACT_MESSAGES);
    const store = tx.objectStore(STORE_NAME_CONTACT_MESSAGES);
    const messages = await store.getAll();

    const returnObj = {};
    let newestTimestap = 0;

    for (const doc of messages.sort((a, b) => a.timestamp - b.timestamp)) {
      const savingKey = doc.contactPubKey;
      const parsedMessage = JSON.parse(doc.message);

      if (doc.timestamp > newestTimestap) {
        newestTimestap = doc.timestamp;
      }

      if (!returnObj[savingKey]) {
        returnObj[savingKey] = {
          messages: [parsedMessage],
          lastUpdated: doc.timestamp,
        };
      } else {
        returnObj[savingKey] = {
          messages: [parsedMessage].concat(returnObj[savingKey].messages),
          lastUpdated: doc.timestamp,
        };
      }
    }

    const retrivedLocalStorageItem = Storage.getItem(
      LOCALSTORAGE_LAST_RECEIVED_TIME_KEY,
    );
    const savedNewestTime = retrivedLocalStorageItem || 0;
    const convertedTime = newestTimestap || getTwoWeeksAgoDate();

    if (savedNewestTime < convertedTime) {
      newestTimestap = convertedTime;
    } else {
      newestTimestap = savedNewestTime;
    }

    return { ...returnObj, lastMessageTimestamp: newestTimestap };
  } catch (err) {
    console.error(err, "get cached message IDB error");
    return false;
  }
};

export const queueSetCashedMessages = ({ newMessagesList, myPubKey }) => {
  messageQueue.push({ newMessagesList, myPubKey });
  if (messageQueue.length === 1) {
    processQueue();
  }
};

const processQueue = async () => {
  if (messageQueue.length === 0 || isProcessing) return;
  isProcessing = true;

  while (messageQueue.length > 0) {
    const { newMessagesList, myPubKey } = messageQueue.shift();
    try {
      await Promise.all([
        addUnpaidContactTransactions({ newMessagesList, myPubKey }),
        setCashedMessages({
          newMessagesList,
          myPubKey,
        }),
      ]);
    } catch (err) {
      console.error("Error processing batch in queue:", err);
    }
  }

  isProcessing = false;
};

const addUnpaidContactTransactions = async ({ newMessagesList, myPubKey }) => {
  let formatted = [];
  for (const message of newMessagesList) {
    const parsedMessage = message.message;
    if (message.isReceived && parsedMessage?.txid) {
      formatted.push({
        id: parsedMessage.txid,
        description:
          parsedMessage.description ||
          i18next.t("contacts.sendAndRequestPage.contactMessage", {
            name: parsedMessage?.name || "",
          }),
        sendersPubkey: message.sendersPubkey,
        details: "",
      });
    }
  }
  if (formatted.length > 0) {
    await addBulkUnpaidSparkContactTransactions(formatted);
  }
};

const setCashedMessages = async ({ newMessagesList, myPubKey }) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME_CONTACT_MESSAGES, "readwrite");
  const store = tx.objectStore(STORE_NAME_CONTACT_MESSAGES);

  try {
    if (!newMessagesList.length) return;
    for (const newMessage of newMessagesList) {
      const existing = await store.get(newMessage.message.uuid);
      const parsedMessage = existing ? JSON.parse(existing.message) : null;

      const addedProperties =
        newMessage.toPubKey === myPubKey
          ? { wasSeen: false, didSend: false }
          : { wasSeen: true, didSend: true };

      const contactPubKey =
        newMessage.toPubKey === myPubKey
          ? newMessage.fromPubKey
          : newMessage.toPubKey;

      if (!parsedMessage) {
        const insertedMessage = {
          ...newMessage,
          contactPubKey,
          messageUUID: newMessage.message.uuid,
          message: JSON.stringify({
            ...newMessage,
            message: {
              ...newMessage.message,
              ...addedProperties,
            },
          }),
        };
        await store.put(insertedMessage);
        console.log("Message created:", insertedMessage);
      } else {
        const updatedMessage = {
          ...parsedMessage,
          message: {
            ...parsedMessage.message,
            ...newMessage.message,
          },
          timestamp: newMessage.timestamp,
        };

        await store.put({
          ...existing,
          message: JSON.stringify(updatedMessage),
          timestamp: newMessage.timestamp,
        });
        console.log("Message updated:", updatedMessage);
      }
    }

    await tx.done;
    console.log(newMessagesList, "sourted timestamps");
    const sortedTimestamps = newMessagesList.sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    console.log(sortedTimestamps, "sourted timestamps");
    const newTimestamp = newMessagesList.sort(
      (a, b) => b.timestamp - a.timestamp,
    )[0].timestamp;

    Storage.setItem(LOCALSTORAGE_LAST_RECEIVED_TIME_KEY, newTimestamp);

    contactsSQLEventEmitter.emit(
      CONTACTS_TRANSACTION_UPDATE_NAME,
      "addedMessage",
    );

    return true;
  } catch (err) {
    console.error(err, "set cached messages IDB error");
    return false;
  }
};

export const deleteCachedMessages = async (contactPubKey) => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME_CONTACT_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_NAME_CONTACT_MESSAGES);
    const index = store.index("contactPubKey");
    const messages = await index.getAllKeys(contactPubKey);

    for (const key of messages) {
      await store.delete(key);
    }

    await tx.done;

    console.log(`Deleted all messages for contactPubKey: ${contactPubKey}`);
    contactsSQLEventEmitter.emit(
      CONTACTS_TRANSACTION_UPDATE_NAME,
      "deleatedMessage",
    );
    return true;
  } catch (err) {
    console.error("Error deleting messages:", err);
    return false;
  }
};

export const deleteTable = async () => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME_CONTACT_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_NAME_CONTACT_MESSAGES);
    const allKeys = await store.getAllKeys();

    for (const key of allKeys) {
      await store.delete(key);
    }

    await tx.done;
    console.log(`Store ${STORE_NAME_CONTACT_MESSAGES} cleared successfully`);
  } catch (err) {
    console.error("Error clearing store:", err);
  }
};
export const wipeEntireContactDatabase = async () => {
  try {
    await deleteDB(DB_NAME);
    console.log("Spark DB deleted successfully");
    return true;
  } catch (err) {
    console.error("Failed to delete DB:", err);
    return false;
  }
};

// Store active retry timers and state to prevent concurrent executions
const activeRetryTimers = new Map();

export const retryUnpaidContactTransactionsWithBackoff = async (
  attempt = 0,
  maxAttempts = 2,
) => {
  const retryKey = "contactRaceRetry";

  try {
    // Get all unpaid contact transactions
    const unpaidTransactions = await getAllSparkContactInvoices();

    if (!unpaidTransactions || unpaidTransactions.length === 0) {
      console.log("No unpaid contact transactions to check");
      activeRetryTimers.delete(retryKey);

      return;
    }

    console.log(
      `Checking ${
        unpaidTransactions.length
      } unpaid contact transactions (attempt ${attempt + 1}/${maxAttempts})`,
    );

    const sparkIDs = unpaidTransactions.map((tx) => tx.sparkID);
    const savedTxMap = await getBulkSparkTransactions(sparkIDs);

    const txsToUpdate = [];
    const txsStillPending = [];
    const txsToDelete = [];

    // Check each unpaid transaction
    for (const unpaidTx of unpaidTransactions) {
      const savedTX = savedTxMap.get(unpaidTx.sparkID);
      if (savedTX) {
        const priorDetails = JSON.parse(savedTX.details);
        // Transaction now exists - prepare update
        console.log(
          `Found transaction for unpaid contact: ${unpaidTx.sparkID}`,
          savedTX,
        );
        txsToUpdate.push({
          id: unpaidTx.sparkID,
          paymentStatus: savedTX.paymentStatus,
          paymentType: savedTX.paymentType,
          accountId: savedTX.accountId,
          details: {
            ...priorDetails,
            description: unpaidTx.description,
            sendingUUID: unpaidTx.sendersPubkey,
            isBlitzContactPayment: true,
          },
        });

        // Delete from unpaid table since we're updating the main transaction
        txsToDelete.push(unpaidTx.sparkID);
      } else {
        txsStillPending.push(unpaidTx.sparkID);
      }
    }

    // Delete from unpaid table
    if (txsToDelete.length > 0) {
      console.log(txsToDelete, "transactions to delete");
      await deleteBulkSparkContactTransactions(txsToDelete);
    }

    // Update transactions that were found
    if (txsToUpdate.length > 0) {
      console.log(
        `Updating ${txsToUpdate.length} transactions with contact details`,
      );
      await addBulkUnpaidSparkContactTransactions(
        txsToUpdate,
        "contactDetailsUpdate",
        0,
        0,
        true,
      );
    }

    // If there are still pending transactions and we haven't exceeded max attempts, retry
    if (txsStillPending.length > 0 && attempt < maxAttempts - 1) {
      const delay = 500 * Math.pow(2, attempt); // 500ms, 1s,
      console.log(
        `${txsStillPending.length} transactions still pending, retrying in ${delay}ms`,
      );

      const timeoutId = setTimeout(() => {
        retryUnpaidContactTransactionsWithBackoff(attempt + 1, maxAttempts);
      }, delay);

      activeRetryTimers.set(retryKey, timeoutId);
    } else {
      if (txsStillPending.length > 0) {
        console.log(
          `Max retry attempts reached. ${txsStillPending.length} transactions remain unpaid`,
        );
      } else {
        console.log("All unpaid contact transactions resolved");
      }
      activeRetryTimers.delete(retryKey);
    }
  } catch (err) {
    console.error("Error in retry unpaid contact transactions:", err);
    activeRetryTimers.delete(retryKey);
  }
};

export const startContactPaymentMatchRetrySequance = () => {
  // Clear any existing retry timers
  clearContactRaceRetryTimers();

  // Start new retry sequence
  console.log("Starting new exponential backoff retry sequence");

  retryUnpaidContactTransactionsWithBackoff();
};

export const clearContactRaceRetryTimers = () => {
  for (const [key, timeoutId] of activeRetryTimers) {
    clearTimeout(timeoutId);
    console.log(`Cleared contact retry timer: ${key}`);
  }
  activeRetryTimers.clear();
};
