import { openDB, deleteDB } from "idb";

export const CACHED_SAVINGS = "SAVED_SAVINGS";
const GOALS_TABLE = "savings_goals";
const TRANSACTIONS_TABLE = "savings_transactions";
const PAYOUTS_TABLE = "savings_payouts";

const VALID_TX_TYPES = ["deposit", "withdrawal", "bitcoinWithdrawal"];

let dbPromise = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(CACHED_SAVINGS, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(GOALS_TABLE)) {
          const goalsStore = db.createObjectStore(GOALS_TABLE, {
            keyPath: "id",
          });
          goalsStore.createIndex("createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains(TRANSACTIONS_TABLE)) {
          const txStore = db.createObjectStore(TRANSACTIONS_TABLE, {
            keyPath: "id",
          });
          txStore.createIndex("goalId", "goalId");
          txStore.createIndex("timestamp", "timestamp");
          txStore.createIndex("goalId_timestamp", ["goalId", "timestamp"]);
        }

        if (!db.objectStoreNames.contains(PAYOUTS_TABLE)) {
          const payoutsStore = db.createObjectStore(PAYOUTS_TABLE, {
            keyPath: "txId",
          });
          payoutsStore.createIndex("day", "day");
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

export const initSavingsDb = async () => {
  try {
    await getDB();
    return true;
  } catch (err) {
    console.error("initSavingsDb error:", err);
    return false;
  }
};

// --- Goals ---

export const createSavingsGoal = async (goal) => {
  if (!goal?.id) throw new Error("Goal id is required");
  if (!goal?.name?.trim()) throw new Error("Goal name is required");

  const db = await getDB();
  const now = Date.now();
  const goalToSave = {
    id: goal.id,
    name: String(goal.name).trim(),
    targetAmountMicros: Math.max(
      0,
      Math.round(Number(goal.targetAmountMicros || 0)),
    ),
    createdAt: Number(goal.createdAt || now),
    updatedAt: Number(goal.updatedAt || now),
    metadata: goal.metadata ?? null,
  };

  await db.add(GOALS_TABLE, goalToSave);
  return goalToSave;
};

export const updateSavingsGoal = async (goalId, patch) => {
  const existing = await getSavingsGoalById(goalId);
  if (!existing) return null;

  const db = await getDB();
  const updatedGoal = {
    ...existing,
    name:
      patch && Object.prototype.hasOwnProperty.call(patch, "name")
        ? String(patch.name || "").trim()
        : existing.name,
    targetAmountMicros:
      patch && Object.prototype.hasOwnProperty.call(patch, "targetAmountMicros")
        ? Math.max(0, Math.round(Number(patch.targetAmountMicros || 0)))
        : existing.targetAmountMicros,
    metadata:
      patch && Object.prototype.hasOwnProperty.call(patch, "metadata")
        ? (patch.metadata ?? null)
        : (existing.metadata ?? null),
    updatedAt: Date.now(),
  };

  if (!updatedGoal.name) throw new Error("Goal name is required");

  await db.put(GOALS_TABLE, updatedGoal);
  return updatedGoal;
};

export const deleteSavingsGoal = async (goalId) => {
  const db = await getDB();
  // Delete associated transactions first (no FK cascade in IDB)
  const txIds = await db.getAllKeysFromIndex(
    TRANSACTIONS_TABLE,
    "goalId",
    goalId,
  );
  const txDb = db.transaction(TRANSACTIONS_TABLE, "readwrite");
  for (const key of txIds) await txDb.store.delete(key);
  await txDb.done;

  await db.delete(GOALS_TABLE, goalId);
  return true;
};

export const getSavingsGoalById = async (goalId) => {
  const db = await getDB();
  const row = await db.get(GOALS_TABLE, goalId);
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name || ""),
    targetAmountMicros: Number(row.targetAmountMicros || 0),
    createdAt: Number(row.createdAt || 0),
    updatedAt: Number(row.updatedAt || 0),
    metadata: row.metadata ?? null,
  };
};

export const getSavingsGoals = async () => {
  const db = await getDB();
  const rows = await db.getAllFromIndex(GOALS_TABLE, "createdAt");
  return rows.reverse().map((row) => ({
    id: String(row.id),
    name: String(row.name || ""),
    targetAmountMicros: Number(row.targetAmountMicros || 0),
    createdAt: Number(row.createdAt || 0),
    updatedAt: Number(row.updatedAt || 0),
    metadata: row.metadata ?? null,
  }));
};

// --- Transactions ---

export const createSavingsTransaction = async (transaction) => {
  if (!transaction?.id) throw new Error("Transaction id is required");
  if (!transaction?.goalId) throw new Error("goalId is required");
  if (!VALID_TX_TYPES.includes(transaction.type)) {
    throw new Error(
      `Transaction type must be one of: ${VALID_TX_TYPES.join(", ")}`,
    );
  }

  const db = await getDB();
  const tx = {
    id: transaction.id,
    goalId: transaction.goalId,
    type: transaction.type,
    amountMicros: Math.max(
      0,
      Math.round(Number(transaction.amountMicros || 0)),
    ),
    timestamp: Number(transaction.timestamp || Date.now()),
  };

  await db.put(TRANSACTIONS_TABLE, tx);
  return tx;
};

export const createSavingsTransactions = async (transactions) => {
  if (!Array.isArray(transactions))
    throw new Error("transactions must be an array");
  if (!transactions.length) return [];

  const normalized = transactions.map((transaction) => {
    if (!transaction?.id) throw new Error("Transaction id is required");
    if (!transaction?.goalId) throw new Error("goalId is required");
    if (!VALID_TX_TYPES.includes(transaction.type)) {
      throw new Error(
        `Transaction type must be one of: ${VALID_TX_TYPES.join(", ")}`,
      );
    }
    return {
      id: transaction.id,
      goalId: transaction.goalId,
      type: transaction.type,
      amountMicros: Math.max(
        0,
        Math.round(Number(transaction.amountMicros || 0)),
      ),
      timestamp: Number(transaction.timestamp || Date.now()),
    };
  });

  const db = await getDB();
  const tx = db.transaction(TRANSACTIONS_TABLE, "readwrite");
  for (const item of normalized) await tx.store.put(item);
  await tx.done;

  return normalized;
};

export const getSavingsTransactions = async (goalId) => {
  const db = await getDB();
  const rows = await db.getAllFromIndex(TRANSACTIONS_TABLE, "goalId", goalId);
  return rows
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((row) => ({
      id: String(row.id),
      goalId: String(row.goalId),
      type: row.type,
      amountMicros: Number(row.amountMicros || 0),
      timestamp: Number(row.timestamp || 0),
    }));
};

export const getAllSavingsTransactions = async () => {
  const db = await getDB();
  const rows = await db.getAllFromIndex(TRANSACTIONS_TABLE, "timestamp");
  return rows.reverse().map((row) => ({
    id: String(row.id),
    goalId: String(row.goalId),
    type: row.type,
    amountMicros: Number(row.amountMicros || 0),
    timestamp: Number(row.timestamp || 0),
  }));
};

// --- Payouts ---

export const setPayoutsTransactions = async (payouts) => {
  if (!Array.isArray(payouts)) throw new Error("payouts must be an array");

  const db = await getDB();
  const BATCH_SIZE = 25;

  try {
    for (let i = 0; i < payouts.length; i += BATCH_SIZE) {
      const batch = payouts.slice(i, i + BATCH_SIZE);
      const tx = db.transaction(PAYOUTS_TABLE, "readwrite");

      for (const payout of batch) {
        if (!payout?.txId) continue;
        await tx.store.put({
          payoutSats: payout.payoutSats,
          status: payout.status,
          txId: payout.txId,
          createdAt: new Date(payout.createdAt).getTime(),
          day: new Date(payout.day).getTime(),
          paidAt: new Date(payout.paidAt).getTime(),
        });
      }

      await tx.done;
    }

    console.log("All payout batches processed successfully");
    return true;
  } catch (err) {
    console.error("Fatal error in setPayoutsTransactions:", err);
    return false;
  }
};

export const getAllPayoutsTransactions = async () => {
  const db = await getDB();
  const rows = await db.getAllFromIndex(PAYOUTS_TABLE, "day");
  return rows.reverse().map((row) => ({
    payoutSats: row.payoutSats,
    status: row.status,
    txId: row.txId,
    createdAt: row.createdAt,
    day: row.day,
    paidAt: row.paidAt,
  }));
};

// --- Teardown ---

export const deleteSavingsGoalsTable = async () => {
  const db = await getDB();
  const tx = db.transaction(GOALS_TABLE, "readwrite");
  await tx.store.clear();
  await tx.done;
};

export const deleteSavingsTransactionsTable = async () => {
  const db = await getDB();
  const tx = db.transaction(TRANSACTIONS_TABLE, "readwrite");
  await tx.store.clear();
  await tx.done;
};

export const deleteSavingsPayoutsTable = async () => {
  const db = await getDB();
  const tx = db.transaction(PAYOUTS_TABLE, "readwrite");
  await tx.store.clear();
  await tx.done;
};

export const wipeEntireSavingsDatabase = async () => {
  try {
    await deleteDB(CACHED_SAVINGS);
    dbPromise = null;
    return true;
  } catch (err) {
    console.error("Failed to delete savings DB:", err);
    return false;
  }
};
