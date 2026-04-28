import { openDB, deleteDB } from "idb";
import fetchBackend from "../../../db/handleBackend";

export const GIFT_CARDS_DB_NAME = "giftCards";
export const GIFT_CARDS_TABLE_NAME = "giftCardsTable";
export const GIFT_CARD_UPDATE_EVENT_NAME = "GIFT_CARD_UPDATED";

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(GIFT_CARDS_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(GIFT_CARDS_TABLE_NAME)) {
          const store = db.createObjectStore(GIFT_CARDS_TABLE_NAME, {
            keyPath: "invoice",
          });
          store.createIndex("lastUpdated", "lastUpdated");
          store.createIndex("status", "status");
        }
      },
      blocking(cv, bv, event) {
        event.target.close();
        dbPromise = null;
      },
    });
  }
  return dbPromise;
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    dbPromise?.then((db) => db.close());
    dbPromise = null;
  });
}

export const initializeGiftCardDatabase = async () => {
  try {
    await getDB();
    console.log("Gift card database initialized");
    return true;
  } catch (err) {
    console.log("Error initializing gift card database:", err);
    return false;
  }
};

export const getGiftCardData = async (invoice) => {
  try {
    const db = await getDB();
    const result = await db.get(GIFT_CARDS_TABLE_NAME, invoice);
    if (!result) return null;
    return {
      ...result.giftCardData,
      lastUpdated: result.lastUpdated,
      isCached: true,
    };
  } catch (err) {
    console.log("Error getting gift card data:", err);
    return null;
  }
};

export const saveGiftCardData = async (invoice, giftCardData) => {
  try {
    const db = await getDB();
    await db.put(GIFT_CARDS_TABLE_NAME, {
      invoice,
      giftCardData,
      lastUpdated: Date.now(),
      status: giftCardData.status || "Unknown",
    });
    return true;
  } catch (err) {
    console.log("Error saving gift card data:", err);
    return false;
  }
};

export const fetchAndCacheGiftCardData = async (
  invoice,
  contactsPrivateKey,
  publicKey,
) => {
  try {
    const cachedData = await getGiftCardData(invoice);
    if (cachedData && cachedData.status === "Completed") return cachedData;

    const response = await fetchBackend(
      "theBitcoinCompanyV3",
      { type: "giftCardStatus", invoice },
      contactsPrivateKey,
      publicKey,
    );

    if (response.statusCode !== 200) throw new Error("backend fetch error");

    const data = response.result[0];
    if (data && typeof data === "object") {
      await saveGiftCardData(invoice, data);
      return data;
    }

    return cachedData || null;
  } catch (err) {
    console.log("Error fetching gift card data:", err);
    return (await getGiftCardData(invoice)) || null;
  }
};

export const getAllGiftCards = async () => {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(GIFT_CARDS_TABLE_NAME, "lastUpdated");
    return all.reverse().map((row) => ({
      invoice: row.invoice,
      ...row.giftCardData,
      lastUpdated: row.lastUpdated,
      isCached: true,
    }));
  } catch (err) {
    console.log("Error getting all gift cards:", err);
    return [];
  }
};

export const deleteGiftCardData = async (invoice) => {
  try {
    const db = await getDB();
    await db.delete(GIFT_CARDS_TABLE_NAME, invoice);
    return true;
  } catch (err) {
    console.log("Error deleting gift card data:", err);
    return false;
  }
};

export const wipeEntireGiftCardDatabase = async () => {
  try {
    await deleteDB(GIFT_CARDS_DB_NAME);
    dbPromise = null;
    return true;
  } catch (err) {
    console.error("Failed to delete gift card DB:", err);
    return false;
  }
};
