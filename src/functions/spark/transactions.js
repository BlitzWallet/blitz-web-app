import { openDB, deleteDB } from "idb";
import EventEmitter from "events";
import { handleEventEmitterPost } from "../handleEventEmitters";

export const SPARK_TRANSACTIONS_DATABASE_NAME = "spark-info-db";
export const SPARK_TRANSACTIONS_TABLE_NAME = "SPARK_TRANSACTIONS";
export const LIGHTNING_REQUEST_IDS_TABLE_NAME = "LIGHTNING_REQUEST_IDS";
export const SPARK_REQUEST_IDS_TABLE_NAME = "SPARK_REQUEST_IDS";
export const sparkTransactionsEventEmitter = new EventEmitter();
export const SPARK_TX_UPDATE_ENVENT_NAME = "UPDATE_SPARK_STATE";
export const HANDLE_FLASHNET_AUTO_SWAP = "HANDLE_FLASHNET_AUTO_SWAP";
export const flashnetAutoSwapsEventListener = new EventEmitter();

let bulkUpdateTransactionQueue = [];
let isProcessingBulkUpdate = false;

let db;
let isInitialized = false;
let initPromise = null;

async function openDBConnection() {
  if (!initPromise) {
    initPromise = (async () => {
      db = await openDB(SPARK_TRANSACTIONS_DATABASE_NAME, 2, {
        upgrade(database) {
          if (
            !database.objectStoreNames.contains(SPARK_TRANSACTIONS_TABLE_NAME)
          ) {
            const txStore = database.createObjectStore(
              SPARK_TRANSACTIONS_TABLE_NAME,
              {
                keyPath: "sparkID",
              },
            );
            txStore.createIndex("paymentStatus", "paymentStatus");
            txStore.createIndex("accountId", "accountId");
          }
          if (
            !database.objectStoreNames.contains(
              LIGHTNING_REQUEST_IDS_TABLE_NAME,
            )
          ) {
            database.createObjectStore(LIGHTNING_REQUEST_IDS_TABLE_NAME, {
              keyPath: "sparkID",
            });
          }
          if (
            !database.objectStoreNames.contains(SPARK_REQUEST_IDS_TABLE_NAME)
          ) {
            database.createObjectStore(SPARK_REQUEST_IDS_TABLE_NAME, {
              keyPath: "sparkID",
            });
          }
        },
      });
      isInitialized = true;
      return db;
    })();
  }
  return initPromise;
}

export const isSparkTxDatabaseOpen = () => {
  return isInitialized;
};

export const ensureSparkDatabaseReady = async () => {
  if (!isInitialized) {
    await openDBConnection();
  }
  return db;
};

export const initializeSparkDatabase = async () => {
  try {
    await ensureSparkDatabaseReady();
    console.log("Opened spark transaction and contacts tables");
    return true;
  } catch (err) {
    console.log("Spark Database initialization failed:", err);
    return false;
  }
};

// Helper: parse details string to object
const parseDetailsToObject = (details) => {
  if (!details) return {};
  if (typeof details === "object") return details;
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
};

export const getAllSparkTransactions = async (options = {}) => {
  try {
    await ensureSparkDatabaseReady();
    const {
      limit = null,
      offset = null,
      accountId = null,
      startRange = null,
      endRange = null,
      idsOnly = false,
    } = options;

    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);

    let filtered = all;
    if (accountId) {
      filtered = all.filter((tx) => tx.accountId === String(accountId));
    }

    // Sort by time in details (newest first)
    filtered.sort((a, b) => {
      const aTime = parseDetailsToObject(a.details).time ?? 0;
      const bTime = parseDetailsToObject(b.details).time ?? 0;
      return bTime - aTime;
    });

    if (startRange !== null && endRange !== null) {
      filtered = filtered.slice(startRange, endRange + 1);
    } else if (limit !== null && offset !== null) {
      filtered = filtered.slice(offset, offset + limit);
    } else if (limit !== null) {
      filtered = filtered.slice(0, limit);
    }

    return idsOnly ? filtered.map((row) => row.sparkID) : filtered;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
};

/**
 * Fetch transactions matching a named filter.
 *
 * @param {'All'|'Lightning'|'Bitcoin'|'Spark'|'Contacts'|'Gifts'|'Swaps'|'Savings'|'Pools'} filterType
 * @param {{ accountId: string }} options
 * @returns {Promise<Object[]>}
 */
export const getFilteredTransactions = async (filterType, options = {}) => {
  const { accountId } = options;

  if (filterType === "All") {
    return getAllSparkTransactions({ accountId });
  }

  try {
    await ensureSparkDatabaseReady();

    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);
    const forAccount = all.filter((tx) => tx.accountId === String(accountId));

    let filtered;

    switch (filterType) {
      case "Lightning":
        filtered = forAccount.filter((tx) => tx.paymentType === "lightning");
        break;

      case "Bitcoin":
        filtered = forAccount.filter((tx) => tx.paymentType === "bitcoin");
        break;

      case "Spark":
        filtered = forAccount.filter((tx) => tx.paymentType === "spark");
        break;

      case "Contacts":
        filtered = forAccount.filter((tx) => {
          const d = parseDetailsToObject(tx.details);
          return (
            typeof d.sendingUUID === "string" && d.sendingUUID.trim() !== ""
          );
        });
        break;

      case "Gifts":
        filtered = forAccount.filter((tx) => {
          const d = parseDetailsToObject(tx.details);
          return d.isGift === true || d.isGift === 1;
        });
        break;

      case "Swaps":
        filtered = forAccount.filter((tx) => {
          const d = parseDetailsToObject(tx.details);
          const isIncomingSwap =
            d.showSwapLabel === 1 || d.showSwapLabel === true;
          const isOutgoingSwap =
            (d.isLRC20Payment === 1 || d.isLRC20Payment === true) &&
            d.direction === "OUTGOING" &&
            (tx.paymentType === "lightning" || tx.paymentType === "bitcoin");
          return isIncomingSwap || isOutgoingSwap;
        });
        break;

      case "Savings":
        filtered = forAccount.filter((tx) => {
          const d = parseDetailsToObject(tx.details);
          return d.isSavings === true || d.isSavings === 1;
        });
        break;

      case "Pools":
        filtered = forAccount.filter((tx) => {
          const d = parseDetailsToObject(tx.details);
          return d.isPoolPayment === true || d.isPoolPayment === 1;
        });
        break;

      default:
        console.warn(
          `getFilteredTransactions: unknown filterType "${filterType}", returning all`,
        );
        return getAllSparkTransactions({ accountId });
    }

    // Sort by time (newest first)
    filtered.sort((a, b) => {
      const aTime = parseDetailsToObject(a.details).time ?? 0;
      const bTime = parseDetailsToObject(b.details).time ?? 0;
      return bTime - aTime;
    });

    return filtered || [];
  } catch (error) {
    console.error(`Error in getFilteredTransactions (${filterType}):`, error);
    return [];
  }
};

export const getBulkSparkTransactions = async (sparkIDs) => {
  if (!sparkIDs || sparkIDs.length === 0) return new Map();

  try {
    await ensureSparkDatabaseReady();

    const txMap = new Map();
    await Promise.all(
      sparkIDs.map(async (id) => {
        const tx = await db.get(SPARK_TRANSACTIONS_TABLE_NAME, id);
        if (tx) txMap.set(tx.sparkID, tx);
      }),
    );

    return txMap;
  } catch (error) {
    console.error("Error fetching bulk spark transactions:", error);
    return new Map();
  }
};

export const deleteBulkSparkContactTransactions = async (sparkIDs) => {
  if (!sparkIDs || sparkIDs.length === 0) return 0;

  try {
    await ensureSparkDatabaseReady();

    const tx = db.transaction(SPARK_REQUEST_IDS_TABLE_NAME, "readwrite");
    const store = tx.objectStore(SPARK_REQUEST_IDS_TABLE_NAME);

    let deleted = 0;
    await Promise.all(
      sparkIDs.map(async (id) => {
        const existing = await store.get(id);
        if (existing) {
          await store.delete(id);
          deleted++;
        }
      }),
    );

    await tx.done;
    return deleted;
  } catch (error) {
    console.error("Error deleting bulk spark transactions:", error);
    return 0;
  }
};

export const getAllPendingSparkPayments = async (accountId) => {
  try {
    await ensureSparkDatabaseReady();

    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);

    let filtered = all.filter((tx) => tx.paymentStatus === "pending");

    if (accountId !== undefined && accountId !== null && accountId !== "") {
      filtered = filtered.filter((tx) => tx.accountId === String(accountId));
    }

    return filtered || [];
  } catch (error) {
    console.error("Error fetching pending spark payments:", error);
    return [];
  }
};

export const getAllSparkContactInvoices = async () => {
  try {
    await ensureSparkDatabaseReady();
    return await db.getAll(SPARK_REQUEST_IDS_TABLE_NAME);
  } catch (error) {
    console.error("Error fetching contacts saved transactions:", error);
  }
};

export const addSingleUnpaidSparkTransaction = async (tx) => {
  if (!tx || !tx.id) {
    console.error("Invalid transaction object");
    return false;
  }

  try {
    await ensureSparkDatabaseReady();
    await db.put(SPARK_REQUEST_IDS_TABLE_NAME, {
      sparkID: tx.id,
      description: tx.description,
      sendersPubkey: tx.sendersPubkey,
      details: JSON.stringify(tx.details),
    });
    console.log("sucesfully added unpaid contacts invoice", tx);
    return true;
  } catch (error) {
    console.error("Error adding spark transaction:", error);
    return false;
  }
};

export const addBulkUnpaidSparkContactTransactions = async (transactions) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    console.error("Invalid transactions array");
    return { success: false, added: 0, failed: 0 };
  }

  const validTransactions = transactions.filter((tx) => tx && tx.id);

  if (validTransactions.length === 0) {
    console.error("No valid transactions to add");
    return { success: false, added: 0, failed: transactions.length };
  }

  try {
    await ensureSparkDatabaseReady();

    const tx = db.transaction(SPARK_REQUEST_IDS_TABLE_NAME, "readwrite");
    const store = tx.objectStore(SPARK_REQUEST_IDS_TABLE_NAME);

    for (const transaction of validTransactions) {
      await store.put({
        sparkID: transaction.id,
        description: transaction.description,
        sendersPubkey: transaction.sendersPubkey,
        details: JSON.stringify(transaction.details),
      });
    }

    await tx.done;

    console.log(
      `Successfully added ${validTransactions.length} unpaid contact invoices`,
    );
    return {
      success: true,
      added: validTransactions.length,
      failed: transactions.length - validTransactions.length,
    };
  } catch (error) {
    console.error("Error adding bulk spark contact transactions:", error);
    return { success: false, added: 0, failed: transactions.length };
  }
};

export const deleteSparkContactTransaction = async (sparkID) => {
  try {
    await ensureSparkDatabaseReady();
    await db.delete(SPARK_REQUEST_IDS_TABLE_NAME, sparkID);
    return true;
  } catch (error) {
    console.error(`Error deleting transaction ${sparkID}:`, error);
    return false;
  }
};

export const getAllUnpaidSparkLightningInvoices = async () => {
  try {
    await ensureSparkDatabaseReady();
    return await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
};

export const getAllUnpaidHoldInvoicesFromTxs = async () => {
  try {
    await ensureSparkDatabaseReady();

    const all = await db.getAll(SPARK_TRANSACTIONS_TABLE_NAME);

    const filtered = all.filter((row) => {
      const d = parseDetailsToObject(row.details);
      return (
        (d.didClaimHTLC === undefined ||
          d.didClaimHTLC === null ||
          d.didClaimHTLC === false ||
          d.didClaimHTLC === 0) &&
        (d.isHoldInvoice === true || d.isHoldInvoice === 1) &&
        row.paymentStatus === "pending"
      );
    });

    return filtered.map((row) => ({
      ...row,
      details: parseDetailsToObject(row.details),
    }));
  } catch (err) {
    console.log("error getting all hold invoices from txs", err);
    return [];
  }
};

export const addSingleUnpaidSparkLightningTransaction = async (tx) => {
  if (!tx || !tx.id) {
    console.error("Invalid transaction object");
    return false;
  }

  try {
    await ensureSparkDatabaseReady();
    await db.put(LIGHTNING_REQUEST_IDS_TABLE_NAME, {
      sparkID: tx.id,
      amount: Number(tx.amount),
      expiration: tx.expiration,
      description: tx.description,
      shouldNavigate:
        tx.shouldNavigate !== undefined ? (tx.shouldNavigate ? 0 : 1) : 0,
      details: JSON.stringify(tx.details),
    });
    console.log("sucesfully added unpaid lightning invoice", tx);
    return true;
  } catch (error) {
    console.error("Error adding spark transaction:", error);
    return false;
  }
};

export const getSingleSparkLightningRequest = async (sparkRequestID) => {
  if (!sparkRequestID) {
    console.error("Invalid sparkRequestID provided");
    return null;
  }

  try {
    await ensureSparkDatabaseReady();
    const row = await db.get(LIGHTNING_REQUEST_IDS_TABLE_NAME, sparkRequestID);

    if (!row) {
      console.error("Lightning request not found for sparkID:", sparkRequestID);
      return null;
    }

    if (row.details) {
      try {
        row.details =
          typeof row.details === "string"
            ? JSON.parse(row.details)
            : row.details;
      } catch (error) {
        console.warn("Failed to parse request details JSON");
      }
    }

    return row;
  } catch (error) {
    console.error("Error fetching single lightning request:", error);
    return null;
  }
};

export const updateSparkTransactionDetails = async (
  sparkRequestID,
  newDetails,
) => {
  if (!sparkRequestID || typeof newDetails !== "object") {
    console.error("Invalid arguments passed to updateSparkTransactionDetails");
    return false;
  }

  try {
    await ensureSparkDatabaseReady();

    const existing = await db.get(
      LIGHTNING_REQUEST_IDS_TABLE_NAME,
      sparkRequestID,
    );

    if (!existing) {
      console.error("Transaction not found for sparkID:", sparkRequestID);
      return false;
    }

    let existingDetails = {};
    try {
      existingDetails = existing.details
        ? typeof existing.details === "string"
          ? JSON.parse(existing.details)
          : existing.details
        : {};
    } catch {
      console.warn("Failed to parse existing details JSON, resetting it");
    }

    const mergedDetails = { ...existingDetails, ...newDetails };

    await db.put(LIGHTNING_REQUEST_IDS_TABLE_NAME, {
      ...existing,
      details: JSON.stringify(mergedDetails),
    });

    if (newDetails.performSwaptoUSD) {
      flashnetAutoSwapsEventListener.emit(
        HANDLE_FLASHNET_AUTO_SWAP,
        sparkRequestID,
      );
    }

    return true;
  } catch (error) {
    console.error("Error updating spark transaction details:", error);
    return false;
  }
};

export const getPendingAutoSwaps = async () => {
  try {
    await ensureSparkDatabaseReady();

    const all = await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);

    return all
      .map((row) => ({
        ...row,
        details: parseDetailsToObject(row.details),
      }))
      .filter(
        (row) =>
          row.details.finalSparkID != null &&
          (row.details.performSwaptoUSD === 1 ||
            row.details.performSwaptoUSD === true ||
            row.details.performSwaptoUSD == null) &&
          !row.details.completedSwaptoUSD,
      );
  } catch (error) {
    console.error("Error fetching pending auto swaps:", error);
    return [];
  }
};

export const getActiveAutoSwapByAmount = async (amount) => {
  try {
    await ensureSparkDatabaseReady();

    const all = await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);

    const matches = all
      .map((row) => ({
        ...row,
        details: parseDetailsToObject(row.details),
      }))
      .filter(
        (row) =>
          row.details.swapInitiated === 1 &&
          row.details.swapAmount === amount &&
          !row.details.completedSwaptoUSD,
      )
      .sort(
        (a, b) =>
          (b.details.lastSwapAttempt ?? 0) - (a.details.lastSwapAttempt ?? 0),
      );

    return matches.length > 0 ? matches[0] : null;
  } catch (error) {
    console.error("Error finding swap by amount:", error);
    return null;
  }
};

export const bulkUpdateSparkTransactions = async (transactions, ...data) => {
  const [
    updateType = "transactions",
    fee = 0,
    passedBalance = 0,
    shouldUpdateDescription = false,
  ] = data;
  console.log(transactions, "transactions list in bulk updates");
  if (!Array.isArray(transactions) || transactions.length === 0) return;

  return addToBulkUpdateQueue(async () => {
    try {
      await ensureSparkDatabaseReady();
      console.log("Running bulk updates", updateType);
      console.log(transactions);

      // Step 1: Format and deduplicate transactions
      const processedTransactions = new Map();

      for (const tx of transactions) {
        const finalSparkId = tx.id;
        const accountId = tx.accountId;
        const tempSparkId = tx.useTempId ? tx.tempId : tx.id;
        const removeDuplicateKey = `${finalSparkId}_${accountId}`;

        if (processedTransactions.has(removeDuplicateKey)) {
          const existingTx = processedTransactions.get(removeDuplicateKey);

          const mergedDetails = { ...existingTx.details };
          for (const key in tx.details) {
            const value = tx.details[key];
            if (
              value !== "" &&
              value !== null &&
              value !== undefined &&
              value !== 0
            ) {
              mergedDetails[key] = value;
            }
          }

          console.log("Existing details", existingTx.details);
          console.log("merged detials", mergedDetails);

          existingTx.paymentStatus =
            tx.paymentStatus || existingTx.paymentStatus;
          existingTx.paymentType = tx.paymentType || existingTx.paymentType;
          existingTx.accountId = tx.accountId || existingTx.accountId;
          existingTx.details = mergedDetails;
          existingTx.useTempId = tx.useTempId || existingTx.useTempId;
        } else {
          processedTransactions.set(removeDuplicateKey, {
            sparkID: finalSparkId,
            tempSparkId: tx.useTempId ? tempSparkId : null,
            paymentStatus: tx.paymentStatus,
            paymentType: tx.paymentType || "unknown",
            accountId: tx.accountId || "unknown",
            details: tx.details ?? {},
            useTempId: tx.useTempId,
          });
        }
      }

      // Step 2: Batch fetch all existing transactions
      const allSparkIds = [];
      const allTempIds = [];

      for (const [, tx] of processedTransactions) {
        allSparkIds.push(tx.sparkID);
        if (tx.tempSparkId && tx.tempSparkId !== tx.sparkID) {
          allTempIds.push(tx.tempSparkId);
        }
      }

      const idsToFetch = [...new Set([...allSparkIds, ...allTempIds])];
      const existingTxMap = new Map();
      const existingTempTxMap = new Map();

      await Promise.all(
        idsToFetch.map(async (id) => {
          const existing = await db.get(SPARK_TRANSACTIONS_TABLE_NAME, id);
          if (existing) {
            const key = `${existing.sparkID}_${existing.accountId}`;
            existingTxMap.set(key, existing);

            for (const [, processedTx] of processedTransactions) {
              if (processedTx.tempSparkId === existing.sparkID) {
                const tempKey = `${processedTx.tempSparkId}_${existing.accountId}`;
                existingTempTxMap.set(tempKey, existing);
              }
            }
          }
        }),
      );

      // Step 3: Process each unique transaction
      const dbTx = db.transaction(SPARK_TRANSACTIONS_TABLE_NAME, "readwrite");
      const store = dbTx.objectStore(SPARK_TRANSACTIONS_TABLE_NAME);

      let includedFailed = false;

      const mergeDetails = (existingDetailsRaw, newDetails) => {
        const existingDetails = parseDetailsToObject(existingDetailsRaw);
        const merged = { ...existingDetails };
        for (const key in newDetails) {
          const value = newDetails[key];
          if (
            (value !== "" &&
              value !== null &&
              value !== undefined &&
              value !== 0) ||
            (key === "description" && shouldUpdateDescription)
          ) {
            merged[key] = value;
          }
        }
        return JSON.stringify(merged);
      };

      for (const [removeDuplicateKey, processedTx] of processedTransactions) {
        const [finalSparkId, accountId] = removeDuplicateKey.split("_");

        const existingTx = existingTxMap.get(removeDuplicateKey);
        const tempKey = processedTx.tempSparkId
          ? `${processedTx.tempSparkId}_${accountId}`
          : null;
        const existingTempTx = tempKey ? existingTempTxMap.get(tempKey) : null;

        if (processedTx.paymentStatus === "failed") {
          includedFailed = true;
        }

        if (existingTx) {
          const mergedDetails = mergeDetails(
            existingTx.details,
            processedTx.details,
          );

          await store.put({
            ...existingTx,
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: mergedDetails,
          });

          if (existingTempTx && processedTx.tempSparkId !== finalSparkId) {
            await store.delete(processedTx.tempSparkId);
          }
        } else if (existingTempTx) {
          const mergedDetails = mergeDetails(
            existingTempTx.details,
            processedTx.details,
          );

          await store.put({
            ...existingTempTx,
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: mergedDetails,
          });

          if (existingTempTx.sparkID !== finalSparkId) {
            await store.delete(existingTempTx.sparkID);
          }
        } else {
          await store.put({
            sparkID: finalSparkId,
            paymentStatus: processedTx.paymentStatus,
            paymentType: processedTx.paymentType,
            accountId: processedTx.accountId,
            details: JSON.stringify({
              ...processedTx.details,
              dateAddedToDb: Date.now(),
            }),
          });
        }
      }

      await dbTx.done;

      console.log("committing transactions");
      console.log("running sql event emitter");

      handleEventEmitterPost(
        sparkTransactionsEventEmitter,
        SPARK_TX_UPDATE_ENVENT_NAME,
        includedFailed ? "fullUpdate" : updateType,
        fee,
        passedBalance,
      );

      return true;
    } catch (error) {
      console.error("Error upserting transactions batch:", error);
      return false;
    }
  });
};

export const addSingleSparkTransaction = async (
  tx,
  updateType = "fullUpdate",
) => {
  if (!tx || !tx.id) {
    console.error("Invalid transaction object");
    return false;
  }

  try {
    await ensureSparkDatabaseReady();
    const newDetails = tx.details;
    await db.put(SPARK_TRANSACTIONS_TABLE_NAME, {
      sparkID: tx.id,
      paymentStatus: tx.paymentStatus,
      paymentType: tx.paymentType ?? "unknown",
      accountId: tx.accountId ?? "unknown",
      details: JSON.stringify({ ...newDetails, dateAddedToDb: Date.now() }),
    });

    handleEventEmitterPost(
      sparkTransactionsEventEmitter,
      SPARK_TX_UPDATE_ENVENT_NAME,
      updateType,
    );

    return true;
  } catch (error) {
    console.error("Error adding spark transaction:", error);
    return false;
  }
};

export const deleteSparkTransaction = async (sparkID) => {
  try {
    await ensureSparkDatabaseReady();
    await db.delete(SPARK_TRANSACTIONS_TABLE_NAME, sparkID);

    handleEventEmitterPost(
      sparkTransactionsEventEmitter,
      SPARK_TX_UPDATE_ENVENT_NAME,
      "transactions",
    );

    return true;
  } catch (error) {
    console.error(`Error deleting transaction ${sparkID}:`, error);
    return false;
  }
};

export const deleteUnpaidSparkLightningTransaction = async (sparkID) => {
  try {
    await ensureSparkDatabaseReady();
    await db.delete(LIGHTNING_REQUEST_IDS_TABLE_NAME, sparkID);
    return true;
  } catch (error) {
    console.error(`Error deleting transaction ${sparkID}:`, error);
    return false;
  }
};

export const deleteSparkTransactionTable = async () => {
  try {
    await ensureSparkDatabaseReady();
    const tx = db.transaction(SPARK_TRANSACTIONS_TABLE_NAME, "readwrite");
    await tx.objectStore(SPARK_TRANSACTIONS_TABLE_NAME).clear();
    await tx.done;
    return true;
  } catch (error) {
    console.error("Error deleting spark_transactions table:", error);
    return false;
  }
};

export const deleteSparkContactsTransactionsTable = async () => {
  try {
    await ensureSparkDatabaseReady();
    const tx = db.transaction(SPARK_REQUEST_IDS_TABLE_NAME, "readwrite");
    await tx.objectStore(SPARK_REQUEST_IDS_TABLE_NAME).clear();
    await tx.done;
    return true;
  } catch (error) {
    console.error("Error deleting spark_transactions table:", error);
    return false;
  }
};

export const deleteUnpaidSparkLightningTransactionTable = async () => {
  try {
    await ensureSparkDatabaseReady();
    const tx = db.transaction(LIGHTNING_REQUEST_IDS_TABLE_NAME, "readwrite");
    await tx.objectStore(LIGHTNING_REQUEST_IDS_TABLE_NAME).clear();
    await tx.done;
    return true;
  } catch (error) {
    console.error("Error deleting spark_transactions table:", error);
    return false;
  }
};

export const wipeEntireSparkDatabase = async () => {
  try {
    await deleteDB(SPARK_TRANSACTIONS_DATABASE_NAME);
    console.log("Spark DB deleted successfully");
    return true;
  } catch (err) {
    console.error("Failed to delete DB:", err);
    return false;
  }
};

export const cleanStalePendingSparkLightningTransactions = async () => {
  try {
    await ensureSparkDatabaseReady();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoISO = twoWeeksAgo.toISOString();

    const all = await db.getAll(LIGHTNING_REQUEST_IDS_TABLE_NAME);
    for (const tx of all) {
      if (tx.expiration && tx.expiration < twoWeeksAgoISO) {
        await db.delete(LIGHTNING_REQUEST_IDS_TABLE_NAME, tx.sparkID);
      }
    }

    console.log("Stale spark transactions cleaned up");
    return true;
  } catch (error) {
    console.error("Error cleaning stale spark transactions:", error);
    return false;
  }
};

const addToBulkUpdateQueue = async (operation) => {
  console.log("Adding transaction to bulk updates que");
  return new Promise((resolve, reject) => {
    bulkUpdateTransactionQueue.push({
      operation,
      resolve,
      reject,
    });

    if (!isProcessingBulkUpdate) {
      processBulkUpdateQueue();
    }
  });
};

const processBulkUpdateQueue = async () => {
  console.log("Processing bulk updates que");
  if (isProcessingBulkUpdate || bulkUpdateTransactionQueue.length === 0) {
    return;
  }

  isProcessingBulkUpdate = true;

  while (bulkUpdateTransactionQueue.length > 0) {
    const { operation, resolve, reject } = bulkUpdateTransactionQueue.shift();

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  isProcessingBulkUpdate = false;
};
