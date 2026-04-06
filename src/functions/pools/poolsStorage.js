import { openDB, deleteDB } from "idb";

export const CACHED_POOLS = "SAVED_POOLS";
const CACHED_POOLS_TABLE = "poolsTable";
const CONTRIBUTIONS_TABLE = "contributionsTable";

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(CACHED_POOLS, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHED_POOLS_TABLE)) {
          const poolStore = db.createObjectStore(CACHED_POOLS_TABLE, {
            keyPath: "poolId",
          });
          poolStore.createIndex("lastUpdated", "lastUpdated");
          poolStore.createIndex("creatorUUID", "creatorUUID");
        }

        if (!db.objectStoreNames.contains(CONTRIBUTIONS_TABLE)) {
          const contribStore = db.createObjectStore(CONTRIBUTIONS_TABLE, {
            keyPath: "contributionId",
          });
          contribStore.createIndex("poolId", "poolId");
          contribStore.createIndex("poolId_createdAtSeconds", [
            "poolId",
            "createdAtSeconds",
          ]);
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

// --- Pools CRUD ---

export const initPoolDb = async () => {
  try {
    await getDB();
    console.log("Pools database initialized successfully");
    return true;
  } catch (err) {
    console.error("initPoolDb error:", err);
    return false;
  }
};

export const savePoolLocal = async (poolObj) => {
  try {
    if (!poolObj?.poolId) throw new Error("Pool poolId is required");
    if (!poolObj?.creatorUUID) throw new Error("Pool creatorUUID is required");

    const db = await getDB();
    await db.put(CACHED_POOLS_TABLE, {
      ...poolObj,
      lastUpdated: poolObj.lastUpdated || Date.now(),
    });

    console.log("Pool saved locally:", poolObj.poolId);
    return true;
  } catch (err) {
    console.error("savePoolLocal error:", err);
    throw new Error(`Unable to save pool locally: ${err.message}`);
  }
};

export const deletePoolLocal = async (poolId) => {
  try {
    if (!poolId) throw new Error("No poolId provided for deletion");

    const db = await getDB();
    await db.delete(CACHED_POOLS_TABLE, poolId);

    console.log(`Deleted pool with ID: ${poolId}`);
    return true;
  } catch (err) {
    console.error("deletePoolLocal error:", err);
    throw new Error(`Unable to delete pool: ${err.message}`);
  }
};

export const getAllLocalPools = async () => {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(CACHED_POOLS_TABLE, "lastUpdated");
    return all.reverse();
  } catch (err) {
    console.error("getAllLocalPools error:", err);
    return [];
  }
};

export const getPoolByUuid = async (poolId) => {
  try {
    if (!poolId) {
      console.error("No poolId provided for query");
      return null;
    }

    const db = await getDB();
    const result = await db.get(CACHED_POOLS_TABLE, poolId);

    if (!result) {
      console.log(`No pool found with ID: ${poolId}`);
      return null;
    }

    return result;
  } catch (err) {
    console.error("getPoolByUuid error:", err);
    return null;
  }
};

export const updatePoolLocal = async (poolId, updatedFields) => {
  try {
    if (!poolId) throw new Error("Pool poolId is required");

    const db = await getDB();
    const existing = await db.get(CACHED_POOLS_TABLE, poolId);
    if (!existing) throw new Error(`Pool with ID ${poolId} not found`);

    const updatedPool = {
      ...existing,
      ...updatedFields,
      poolId,
      lastUpdated: Date.now(),
    };

    await db.put(CACHED_POOLS_TABLE, updatedPool);

    console.log("Pool updated successfully:", poolId);
    return updatedPool;
  } catch (err) {
    console.error("updatePoolLocal error:", err);
    throw new Error(`Unable to update pool: ${err.message}`);
  }
};

export const deletePoolTable = async () => {
  try {
    await deleteDB(CACHED_POOLS);
    dbPromise = null;
    console.log(`Pools database deleted successfully`);
  } catch (err) {
    console.error("Error deleting pools database:", err);
  }
};

// --- Contributions CRUD ---

function extractCreatedAtTimestamp(contribution) {
  if (contribution.createdAt?.seconds) {
    return {
      seconds: contribution.createdAt.seconds,
      nanos: contribution.createdAt.nanoseconds || 0,
    };
  }
  if (typeof contribution.createdAt === "number") {
    return { seconds: Math.floor(contribution.createdAt / 1000), nanos: 0 };
  }
  return { seconds: Math.floor(Date.now() / 1000), nanos: 0 };
}

export const saveContributionLocal = async (contribution) => {
  try {
    const db = await getDB();
    const { seconds, nanos } = extractCreatedAtTimestamp(contribution);
    await db.put(CONTRIBUTIONS_TABLE, {
      ...contribution,
      createdAtSeconds: seconds,
      createdAtNanos: nanos,
    });
  } catch (err) {
    console.error("saveContributionLocal error:", err);
  }
};

export const saveContributionsBatch = async (contributions) => {
  if (!contributions.length) return;
  try {
    const db = await getDB();
    const tx = db.transaction(CONTRIBUTIONS_TABLE, "readwrite");
    const store = tx.objectStore(CONTRIBUTIONS_TABLE);

    for (const c of contributions) {
      const { seconds, nanos } = extractCreatedAtTimestamp(c);
      await store.put({
        ...c,
        createdAtSeconds: seconds,
        createdAtNanos: nanos,
      });
    }

    await tx.done;
  } catch (err) {
    console.error("saveContributionsBatch error:", err);
  }
};

export const getContributionsForPool = async (poolId) => {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(CONTRIBUTIONS_TABLE, "poolId", poolId);
    return all.sort((a, b) => b.createdAtSeconds - a.createdAtSeconds);
  } catch (err) {
    console.error("getContributionsForPool error:", err);
    return [];
  }
};

export const getLatestContributionTimestamp = async (poolId) => {
  try {
    const contributions = await getContributionsForPool(poolId);
    if (!contributions.length) return { seconds: 0, nanos: 0 };

    const normalizeSeconds = (s) => (s > 9999999999 ? Math.floor(s / 1000) : s);

    const latest = contributions.reduce((best, c) => {
      const ns = normalizeSeconds(c.createdAtSeconds);
      const bs = normalizeSeconds(best.createdAtSeconds);
      return ns > bs || (ns === bs && c.createdAtNanos > best.createdAtNanos)
        ? c
        : best;
    });

    return {
      seconds: normalizeSeconds(latest.createdAtSeconds),
      nanos: latest.createdAtNanos || 0,
    };
  } catch (err) {
    console.error("getLatestContributionTimestamp error:", err);
    return { seconds: 0, nanos: 0 };
  }
};

export const deleteContributionsForPool = async (poolId) => {
  try {
    const db = await getDB();
    const tx = db.transaction(CONTRIBUTIONS_TABLE, "readwrite");
    const index = tx.store.index("poolId");
    const keys = await index.getAllKeys(poolId);
    for (const key of keys) await tx.store.delete(key);
    await tx.done;
  } catch (err) {
    console.error("deleteContributionsForPool error:", err);
  }
};

export const deleteContributionsTable = async () => {
  try {
    await deleteDB(CACHED_POOLS);
    dbPromise = null;
    console.log(`Contributions database deleted successfully`);
  } catch (err) {
    console.error("Error deleting contributions table:", err);
  }
};
