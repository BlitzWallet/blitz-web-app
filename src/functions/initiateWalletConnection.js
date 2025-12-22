import {
  getCachedSparkTransactions,
  getSparkAddress,
  getSparkBalance,
  getSparkIdentityPubKey,
  getSparkTransactions,
  initializeSparkWallet,
  setPrivacyEnabled,
} from "./spark";
import handleBalanceCache from "./spark/handleBalanceCache";
import { cleanStalePendingSparkLightningTransactions } from "./spark/transactions";

export async function initWallet({
  setSparkInformation,
  // toggleGlobalContactsInformation,
  // globalContactsInformation,
  mnemonic,
  hasRestoreCompleted,
}) {
  console.log("HOME RENDER BREEZ EVENT FIRST LOAD");

  try {
    const [didConnectToSpark, balance] = await Promise.all([
      initializeSparkWallet(mnemonic),
      handleBalanceCache({
        isCheck: false,
        mnemonic: mnemonic,
        returnBalanceOnly: true,
      }),
    ]);

    console.log(didConnectToSpark, balance);

    if (balance) {
      setSparkInformation((prev) => ({
        ...prev,
        didConnect: true,
        balance: balance,
      }));
    }

    if (didConnectToSpark.isConnected) {
      const didSetSpark = await initializeSparkSession({
        setSparkInformation,
        // globalContactsInformation,
        // toggleGlobalContactsInformation,
        mnemonic,
        hasRestoreCompleted,
      });

      if (!didSetSpark)
        throw new Error(
          "Spark wallet information was not set properly, please try again."
        );
    } else {
      throw new Error(
        "We were unable to connect to the spark node. Please try again."
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
}) {
  try {
    // Clean DB state but do not hold up process
    cleanStalePendingSparkLightningTransactions();
    const [balance, sparkAddress, identityPubKey] = await Promise.all([
      getSparkBalance(mnemonic),
      getSparkAddress(mnemonic),
      getSparkIdentityPubKey(mnemonic),
    ]);

    setPrivacyEnabled(mnemonic);

    const transactions = await getCachedSparkTransactions(null, identityPubKey);

    if (transactions === undefined)
      throw new Error("Unable to initialize spark from history");

    if (!balance.didWork) {
      const storageObject = {
        transactions: transactions,
        identityPubKey,
        sparkAddress: sparkAddress.response,
        didConnect: true,
      };
      await new Promise((res) => setTimeout(res, 500));
      setSparkInformation((prev) => ({ ...prev, ...storageObject }));
      return storageObject;
    }

    let didLoadCorrectBalance = false;
    let runCount = 0;
    let maxRunCount = 2;
    let initialBalanceResponse = balance;
    let correctBalance = 0;

    while (runCount < maxRunCount && !didLoadCorrectBalance) {
      runCount += 1;
      let currentBalance = 0;

      if (runCount === 1) {
        currentBalance = Number(initialBalanceResponse.balance);
      } else {
        const retryResponse = await getSparkBalance(mnemonic);
        currentBalance = Number(retryResponse.balance);
      }

      const response = await handleBalanceCache({
        isCheck: true,
        passedBalance: currentBalance,
        mnemonic,
      });

      if (response.didWork) {
        correctBalance = response.balance;
        didLoadCorrectBalance = true;
      } else {
        console.log("Waiting for correct balance resposne");
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    const finalBalanceToUse = didLoadCorrectBalance
      ? correctBalance
      : Number(initialBalanceResponse.balance);
    console.log(
      didLoadCorrectBalance,
      runCount,
      initialBalanceResponse,
      correctBalance,
      finalBalanceToUse,
      "balancasldfkjasdlfkjasdf"
    );
    if (!didLoadCorrectBalance) {
      await handleBalanceCache({
        isCheck: false,
        passedBalance: finalBalanceToUse,
        mnemonic,
      });
    }

    const storageObject = {
      balance: finalBalanceToUse,
      tokens: balance.tokensObj,
      identityPubKey,
      sparkAddress: sparkAddress.response,
      didConnect: true,
    };
    console.log("Spark storage object", storageObject);
    await new Promise((res) => setTimeout(res, 500));

    setSparkInformation((prev) => {
      let txToUse;

      // Restore has not run yet:
      if (
        !hasRestoreCompleted ||
        (prev.identityPubKey && prev.identityPubKey !== identityPubKey)
      ) {
        // We show cached transactions immediately to avoid blanks.
        // But DO NOT overwrite later once restore writes.
        // Fully overwrite if identityPubKey changed (new wallet).
        txToUse = transactions;
      } else {
        // Restore has finished:
        // Never insert fetchedTransactions (they may be stale)
        // Use whatever DB restore already put in state.
        txToUse = prev.transactions;
      }

      return {
        ...prev,
        ...storageObject,
        transactions: txToUse,
      };
    });
    return storageObject;
  } catch (err) {
    console.log("Set spark error", err);
    return false;
  }
}
