import { openDB, deleteDB } from "idb";

export const CACHED_GIFTS = "SAVED_GIFTS";
export const GIFTS_TABLE_NAME = "giftsTable";

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(CACHED_GIFTS, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(GIFTS_TABLE_NAME)) {
          const store = db.createObjectStore(GIFTS_TABLE_NAME, {
            keyPath: "uuid",
          });
          store.createIndex("lastUpdated", "lastUpdated");
          store.createIndex("createdBy", "createdBy");
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

export const initGiftDb = async () => {
  try {
    await getDB();
    console.log("Gift database initialized successfully");
    return true;
  } catch (err) {
    console.error("initGiftDb error:", err);
    return false;
  }
};

export const saveGiftLocal = async (giftObj) => {
  try {
    if (!giftObj?.uuid) throw new Error("Gift UUID is required");
    if (!giftObj?.createdBy) throw new Error("Gift createdBy is required");

    const db = await getDB();
    await db.put(GIFTS_TABLE_NAME, {
      ...giftObj,
      lastUpdated: giftObj.lastUpdated || Date.now(),
    });

    console.log("Gift saved successfully");
    return true;
  } catch (err) {
    console.error("saveGiftLocal error:", err);
    throw new Error(`Unable to save gift locally: ${err.message}`);
  }
};

export const deleteGiftLocal = async (uuid) => {
  try {
    if (!uuid) throw new Error("No UUID provided for deletion");

    const db = await getDB();
    await db.delete(GIFTS_TABLE_NAME, uuid);

    console.log(`Deleted gift with UUID: ${uuid}`);
    return true;
  } catch (err) {
    console.error("deleteGiftLocal error:", err);
    throw new Error(`Unable to delete gift: ${err.message}`);
  }
};

export const getAllLocalGifts = async () => {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(GIFTS_TABLE_NAME, "lastUpdated");
    return all.reverse();
  } catch (err) {
    console.error("getAllLocalGifts error:", err);
    return [];
  }
};

export const getGiftByUuid = async (uuid) => {
  try {
    if (!uuid) {
      console.error("No UUID provided for query");
      return null;
    }

    const db = await getDB();
    const result = await db.get(GIFTS_TABLE_NAME, uuid);

    if (!result) {
      console.log(`No gift found with UUID: ${uuid}`);
      return null;
    }

    return result;
  } catch (err) {
    console.error("getGiftByUuid error:", err);
    return null;
  }
};

export const updateGiftLocal = async (uuid, updatedFields) => {
  try {
    if (!uuid) throw new Error("Gift UUID is required");

    const db = await getDB();
    const existing = await db.get(GIFTS_TABLE_NAME, uuid);
    if (!existing) throw new Error(`Gift with UUID ${uuid} not found`);

    const updatedGift = {
      ...existing,
      ...updatedFields,
      uuid,
      lastUpdated: Date.now(),
    };

    await db.put(GIFTS_TABLE_NAME, updatedGift);

    console.log("Gift updated successfully");
    return updatedGift;
  } catch (err) {
    console.error("updateGiftLocal error:", err);
    throw new Error(`Unable to update gift: ${err.message}`);
  }
};

export const bulkDeleteGiftsLocal = async (uuids) => {
  try {
    if (!uuids || uuids.length === 0) return false;

    const db = await getDB();
    const tx = db.transaction(GIFTS_TABLE_NAME, "readwrite");
    await Promise.all([...uuids.map((uuid) => tx.store.delete(uuid)), tx.done]);

    console.log(`Deleted ${uuids.length} gift(s)`);
    return true;
  } catch (err) {
    console.error("bulkDeleteGiftsLocal error:", err);
    return false;
  }
};

export const bulkSaveGiftsLocal = async (gifts) => {
  try {
    if (!gifts || gifts.length === 0) return false;

    const db = await getDB();
    const now = Date.now();
    const tx = db.transaction(GIFTS_TABLE_NAME, "readwrite");
    await Promise.all([
      ...gifts.map((gift) =>
        tx.store.put({
          ...gift,
          lastUpdated: gift.lastUpdated || now,
        }),
      ),
      tx.done,
    ]);

    console.log(`Saved ${gifts.length} gift(s)`);
    return true;
  } catch (err) {
    console.error("bulkSaveGiftsLocal error:", err);
    return false;
  }
};

export const deleteGiftsTable = async () => {
  try {
    await deleteDB(CACHED_GIFTS);
    dbPromise = null;
    console.log("giftsTable deleted successfully");
  } catch (err) {
    console.error("Error deleting gifts table:", err);
  }
};
