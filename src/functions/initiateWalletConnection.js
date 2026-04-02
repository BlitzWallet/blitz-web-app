import {
  getCachedSparkTransactions,
  getSparkAddress,
  getSparkBalance,
  getSparkIdentityPubKey,
  getSparkTransactions,
  initializeSparkWallet,
  setPrivacyEnabled,
} from "./spark";
import { getAccountBalanceSnapshot } from "./spark/balanceSnapshots";
import handleBalanceCache from "./spark/handleBalanceCache";
import { cleanStalePendingSparkLightningTransactions } from "./spark/transactions";

export async function initWallet({
  setSparkInformation,
  // toggleGlobalContactsInformation,
  // globalContactsInformation,
  mnemonic,
  hasRestoreCompleted = true,
  identityPubKey,
}) {
  try {
    console.log("HOME RENDER BREEZ EVENT FIRST LOAD");

    const didConnectToSpark = await initializeSparkWallet(mnemonic);

    if (didConnectToSpark.isConnected) {
      setSparkInformation((prev) => ({
        ...prev,
        didConnect: true,
        ...(identityPubKey ? { identityPubKey } : {}),
      }));
      const didSetSpark = await initializeSparkSession({
        setSparkInformation,
        // globalContactsInformation,
        // toggleGlobalContactsInformation,
        mnemonic,
        hasRestoreCompleted,
        identityPubKey,
      });

      if (!didSetSpark)
        throw new Error(
          "We were unable to connect to the spark node. Please try again.",
        );
    } else {
      throw new Error(
        didConnectToSpark.error ||
          "We were unable to connect to the spark node. Please try again.",
      );
    }
    return { didWork: true };
  } catch (err) {
    console.log(err, "error initializing function");
    return { didWork: false, error: err.message };
  }
}

async function initializeSparkSession({
  setSparkInformation,
  // globalContactsInformation,
  // toggleGlobalContactsInformation,
  mnemonic,
  hasRestoreCompleted,
  identityPubKey: cachedIdentityPubKey,
}) {
  try {
    // Fire immediately — never blocks the critical path
    cleanStalePendingSparkLightningTransactions();

    // Skip getSparkBalance if a snapshot already exists for this account
    // (loading screen applied it; the balance poller will confirm/update it)
    let skipBalanceFetch = false;
    if (cachedIdentityPubKey) {
      const snapshot = await getAccountBalanceSnapshot(cachedIdentityPubKey);
      skipBalanceFetch = snapshot !== null;
    }

    // Only fetch fresh txs when restoring — returning users keep prev.transactions
    const needsFreshTxs = !hasRestoreCompleted;
    const txsPromise =
      needsFreshTxs && cachedIdentityPubKey
        ? getCachedSparkTransactions(null, cachedIdentityPubKey)
        : null;

    const [balance, sparkAddress, freshIdentityPubKey] = await Promise.all([
      skipBalanceFetch
        ? Promise.resolve({ didWork: false })
        : getSparkBalance(mnemonic),
      getSparkAddress(mnemonic),
      cachedIdentityPubKey
        ? Promise.resolve(cachedIdentityPubKey)
        : getSparkIdentityPubKey(mnemonic),
    ]);

    // Resolve txs: pre-fetched, or fetch now with fresh key, or null for returning users
    const transactions = await (txsPromise ??
      (needsFreshTxs
        ? getCachedSparkTransactions(null, freshIdentityPubKey)
        : null));

    if (transactions === undefined)
      throw new Error("Unable to initialize spark from history");

    // Fire and forget — non-blocking
    setPrivacyEnabled(mnemonic);

    const identityPubKey = freshIdentityPubKey;

    if (!balance.didWork) {
      const storageObject = {
        identityPubKey,
        sparkAddress: sparkAddress.response,
        didConnect: true,
      };
      setSparkInformation((prev) => ({
        ...prev,
        ...storageObject,
        transactions: transactions ?? prev.transactions,
      }));
      return storageObject;
    }

    const storageObject = {
      balance: Number(balance.balance),
      tokens: balance.tokensObj,
      identityPubKey,
      sparkAddress: sparkAddress.response,
      didConnect: true,
      initialBalance: Number(balance.balance),
    };

    setSparkInformation((prev) => {
      const txToUse =
        !hasRestoreCompleted ||
        (prev.identityPubKey && prev.identityPubKey !== identityPubKey)
          ? (transactions ?? prev.transactions)
          : prev.transactions;

      return { ...prev, ...storageObject, transactions: txToUse };
    });
    return storageObject;
  } catch (err) {
    console.log("Set spark error", err);
    return false;
  }
}
