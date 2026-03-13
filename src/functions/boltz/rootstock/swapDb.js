import { openDB, deleteDB } from "idb";

export const ROOTSTOCK_DB_NAME = "ROOTSTOCK_SWAPS";
export const ROOTSTOCK_TABLE_NAME = "saved_rootstock_swaps";

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(ROOTSTOCK_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(ROOTSTOCK_TABLE_NAME)) {
          const store = db.createObjectStore(ROOTSTOCK_TABLE_NAME, {
            keyPath: "id",
          });
          store.createIndex("type", "type");
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

export const initRootstockSwapDB = async () => {
  try {
    await getDB();
    console.log("opened rootstock swaps db");
    return true;
  } catch (err) {
    console.log("error opening rootstock swaps db", err);
    return false;
  }
};

export const saveSwap = async (id, type, data) => {
  try {
    const db = await getDB();
    await db.put(ROOTSTOCK_TABLE_NAME, { id, type, data });
  } catch (err) {
    console.log("error saving rootstock swap", err);
  }
};

export const updateSwap = async (id, newDetails) => {
  try {
    const db = await getDB();
    const existing = await db.get(ROOTSTOCK_TABLE_NAME, id);
    if (!existing) throw new Error(`Swap with id ${id} not found`);

    const updatedData = { ...existing.data, ...newDetails };
    await db.put(ROOTSTOCK_TABLE_NAME, { ...existing, data: updatedData });

    console.log(`Swap ${id} updated successfully`);
    return updatedData;
  } catch (err) {
    console.log("error updating swap", err);
    throw err;
  }
};

export const loadSwaps = async () => {
  try {
    const db = await getDB();
    return await db.getAll(ROOTSTOCK_TABLE_NAME);
  } catch (err) {
    console.error("Error fetching rootstock swaps:", err);
  }
};

export const getSwapById = async (id) => {
  try {
    const db = await getDB();
    const result = await db.get(ROOTSTOCK_TABLE_NAME, id);
    return result ? [result] : [];
  } catch (err) {
    console.error("Error fetching single rootstock swap:", err);
  }
};

export const deleteSwapById = async (id) => {
  try {
    const db = await getDB();
    await db.delete(ROOTSTOCK_TABLE_NAME, id);
    console.log(`Deleted swap with id: ${id}`);
    return true;
  } catch (err) {
    console.error(`Error deleting swap with id ${id}:`, err);
    return false;
  }
};

export const wipeEntireRootstockDatabase = async () => {
  try {
    await deleteDB(ROOTSTOCK_DB_NAME);
    dbPromise = null;
    return true;
  } catch (err) {
    console.error("Failed to delete rootstock DB:", err);
    return false;
  }
};
