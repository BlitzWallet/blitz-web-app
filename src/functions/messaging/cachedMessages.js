import { openDB } from "idb";
import Storage from "../localStorage";
import { getTwoWeeksAgoDate } from "../rotateAddressDateChecker";
import EventEmitter from "events";

export const CACHED_MESSAGES_KEY = "CASHED_CONTACTS_MESSAGES";
export const DB_NAME = `${CACHED_MESSAGES_KEY}`;
export const STORE_NAME = "messagesTable";
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
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
    const tx = db.transaction(STORE_NAME);
    const store = tx.objectStore(STORE_NAME);
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
      LOCALSTORAGE_LAST_RECEIVED_TIME_KEY
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
      await setCashedMessages({ newMessagesList, myPubKey });
    } catch (err) {
      console.error("Error processing batch in queue:", err);
    }
  }

  isProcessing = false;
};

const setCashedMessages = async ({ newMessagesList, myPubKey }) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  try {
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

    const newTimestamp = newMessagesList.sort(
      (a, b) => b.timestamp - a.timestamp
    )[0].timestamp;

    Storage.setItem(LOCALSTORAGE_LAST_RECEIVED_TIME_KEY, newTimestamp);

    contactsSQLEventEmitter.emit(
      CONTACTS_TRANSACTION_UPDATE_NAME,
      "addedMessage"
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("contactPubKey");
    const messages = await index.getAllKeys(contactPubKey);

    for (const key of messages) {
      await store.delete(key);
    }

    await tx.done;

    console.log(`Deleted all messages for contactPubKey: ${contactPubKey}`);
    contactsSQLEventEmitter.emit(
      CONTACTS_TRANSACTION_UPDATE_NAME,
      "deleatedMessage"
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const allKeys = await store.getAllKeys();

    for (const key of allKeys) {
      await store.delete(key);
    }

    await tx.done;
    console.log(`Store ${STORE_NAME} cleared successfully`);
  } catch (err) {
    console.error("Error clearing store:", err);
  }
};
