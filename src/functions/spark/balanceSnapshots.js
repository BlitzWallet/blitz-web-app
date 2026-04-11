import { dbPromise } from "./transactions";

const STORE = "account_balance_snapshots";

export async function saveAccountBalanceSnapshot(
  identityPubKey,
  balance,
  tokensObj,
) {
  try {
    const db = await dbPromise;
    await db.put(STORE, {
      identityPubKey,
      balance,
      tokens: JSON.stringify(tokensObj ?? {}),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.log("Error saving account balance snapshot", err);
  }
}

export async function getAccountBalanceSnapshot(identityPubKey) {
  try {
    const db = await dbPromise;
    const row = await db.get(STORE, identityPubKey);
    if (!row) return null;
    return { balance: row.balance, tokens: JSON.parse(row.tokens) };
  } catch (err) {
    console.log("Error reading account balance snapshot", err);
    return null;
  }
}

export async function getAllAccountBalanceSnapshots() {
  try {
    const db = await dbPromise;
    const rows = await db.getAllFromIndex(STORE, "updatedAt");
    return rows.reverse().map((r) => ({
      identityPubKey: r.identityPubKey,
      balance: r.balance,
      tokens: JSON.parse(r.tokens),
      updatedAt: r.updatedAt,
    }));
  } catch (err) {
    console.log("Error reading all account balance snapshots", err);
    return [];
  }
}
