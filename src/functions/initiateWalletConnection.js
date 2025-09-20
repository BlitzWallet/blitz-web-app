import {
  getCachedSparkTransactions,
  getSparkAddress,
  getSparkBalance,
  getSparkIdentityPubKey,
  getSparkTransactions,
  initializeSparkWallet,
} from "./spark";
import { cleanStalePendingSparkLightningTransactions } from "./spark/transactions";

export async function initWallet({
  setSparkInformation,
  // toggleGlobalContactsInformation,
  // globalContactsInformation,
  mnemonic,
}) {
  console.log("HOME RENDER BREEZ EVENT FIRST LOAD");

  try {
    const didConnectToSpark = await initializeSparkWallet(mnemonic);

    if (didConnectToSpark.isConnected) {
      const didSetSpark = await initializeSparkSession({
        setSparkInformation,
        // globalContactsInformation,
        // toggleGlobalContactsInformation,
        mnemonic,
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
}) {
  try {
    // Clean DB state but do not hold up process
    cleanStalePendingSparkLightningTransactions();
    const [balance, sparkAddress, identityPubKey] = await Promise.all([
      getSparkBalance(mnemonic),
      getSparkAddress(mnemonic),
      getSparkIdentityPubKey(mnemonic),
    ]);

    if (!balance.didWork)
      throw new Error("Unable to initialize spark from history");

    const transactions = await getCachedSparkTransactions(null, identityPubKey);

    if (transactions === undefined)
      throw new Error("Unable to initialize spark from history");

    // if (
    //   !globalContactsInformation.myProfile.sparkAddress ||
    //   !globalContactsInformation.myProfile.sparkIdentityPubKey
    // ) {
    //   toggleGlobalContactsInformation(
    //     {
    //       myProfile: {
    //         ...globalContactsInformation.myProfile,
    //         sparkAddress: sparkAddress.response,
    //         sparkIdentityPubKey: identityPubKey,
    //       },
    //     },
    //     true
    //   );
    // }

    const storageObject = {
      balance: Number(balance.balance),
      tokens: balance.tokensObj,
      transactions: transactions,
      identityPubKey,
      sparkAddress: sparkAddress.response,
      didConnect: true,
    };
    console.log("Spark storage object", storageObject);
    setSparkInformation(storageObject);
    return storageObject;
  } catch (err) {
    console.log("Set spark error", err);
    return false;
  }
}
