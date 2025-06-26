import {
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentStatus,
  getSparkLightningSendRequest,
  getSparkPaymentStatus,
  getSparkTransactions,
} from ".";
import {
  bulkUpdateSparkTransactions,
  getAllPendingSparkPayments,
  getAllSparkTransactions,
} from "./transactions";
import { transformTxToPaymentObject } from "./transformTxToPayment";

export const restoreSparkTxState = async (BATCH_SIZE) => {
  let restoredTxs = [];
  try {
    // here we do not want to save any tx to be shown, we only want to flag that it came from restore and then when we get the actual notification of it we can block the navigation
    let start = 0;
    const savedTxs = await getAllSparkTransactions();
    const savedIds = savedTxs?.map((tx) => tx.sparkID) || [];

    let foundOverlap = false;

    do {
      const txs = await getSparkTransactions(start + BATCH_SIZE, start);
      const batchTxs = txs.transfers || [];

      if (!batchTxs.length) {
        console.log("No more transactions found, ending restore.");
        break;
      }

      // Check for overlap with saved transactions
      const overlap = batchTxs.some((tx) => savedIds.includes(tx.id));

      if (overlap) {
        console.log("Found overlap with saved transactions, stopping restore.");
        foundOverlap = true;
      }

      restoredTxs.push(...batchTxs);
      start += BATCH_SIZE;
    } while (!foundOverlap);

    // Filter out any already-saved txs or dontation payments
    const newTxs = restoredTxs.filter(
      (tx) =>
        !savedIds.includes(tx.id) &&
        !(
          tx.transferDirection === "OUTGOING" &&
          tx.receiverIdentityPublicKey ===
            import.meta.env.VITE_BLITZ_SPARK_PUBKEY
        )
    );

    console.log(`Total restored transactions: ${restoredTxs.length}`);
    console.log(`New transactions after filtering: ${newTxs.length}`);
    return { txs: newTxs };
  } catch (error) {
    console.error("Error in spark restore history state:", error);
    return { txs: [] };
  }
};
export const updateSparkTxStatus = async () =>
  // BATCH_SIZE,
  // useLastLoggedInTime = false,
  {
    // let restoredTxs = [];
    try {
      console.log("Updating Spark transaction status...");
      // let start = 0;
      // Get all saved transactions
      const savedTxs = await getAllPendingSparkPayments();

      const incluedBitcoin = savedTxs.filter(
        (tx) => tx.paymentType !== "lightning"
      );
      let incomingTxs = [];
      if (incluedBitcoin.length) {
        incomingTxs = await getSparkTransactions(100);
      }

      // const savedMap = new Map(savedTxs.map(tx => [tx.sparkID, tx])); // use sparkID as key

      let updatedTxs = [];
      for (const txStateUpdate of savedTxs) {
        // no need to do spark here since it wont ever be shown as pending
        if (txStateUpdate.paymentType === "lightning") {
          const details = JSON.parse(txStateUpdate.details);
          let sparkResponse;
          if (details.direction === "INCOMING") {
            sparkResponse = await getSparkLightningPaymentStatus({
              lightningInvoiceId: txStateUpdate.sparkID,
            });
          } else {
            sparkResponse = await getSparkLightningSendRequest(
              txStateUpdate.sparkID
            );
          }

          if (!sparkResponse?.transfer) continue;

          const tx = {
            useTempId: true,
            tempId: txStateUpdate.sparkID,
            id: sparkResponse
              ? sparkResponse.transfer.sparkId
              : txStateUpdate.sparkID,
            paymentStatus: "completed",
            paymentType: "lightning",
            accountId: txStateUpdate.accountId,
            details: {
              ...details,
              preimage: sparkResponse ? sparkResponse.paymentPreimage : "",
            },
          };
          updatedTxs.push(tx);
        } else {
          if (details.direction === "INCOMING") {
            const bitcoinTransfer = incomingTxs.transfers.find(
              (tx) => tx.id === txStateUpdate.sparkID
            );
            console.log(bitcoinTransfer, "bitocin transfer in pending");
            if (!bitcoinTransfer) continue;
            const tx = {
              id: txStateUpdate.sparkID,
              paymentStatus: "completed",
              paymentType: "bitcoin",
              accountId: txStateUpdate.accountId,
            };
            updatedTxs.push(tx);
          } else {
            const sparkResponse = await getSparkBitcoinPaymentRequest(
              txStateUpdate.sparkID
            );
            if (!sparkResponse?.transfer) continue;
            const details = JSON.parse(txStateUpdate.details);
            const tx = {
              useTempId: true,
              tempId: txStateUpdate.sparkID,
              id: sparkResponse
                ? sparkResponse.transfer.sparkId
                : txStateUpdate.sparkID,
              paymentStatus: "completed",
              paymentType: "bitcoin",
              accountId: txStateUpdate.accountId,
              details: {
                ...details,
                onchainTxid: sparkResponse.coopExitTxid,
              },
            };
            updatedTxs.push(tx);
          }
        }
      }
      console.log(updatedTxs, "updated txs");

      // while (true) {
      //   const txs = await getSparkTransactions(start + BATCH_SIZE, start);
      //   const batchTxs = txs.transfers || [];

      //   if (!batchTxs.length) {
      //     console.log('No more transactions found, ending restore.');
      //     break;
      //   }

      //   const recentTxs = batchTxs.filter(tx => {
      //     const txTime = new Date(tx.updatedTime).getTime();
      //     return txTime >= historicalTime;
      //   });

      //   if (recentTxs.length === 0) {
      //     console.log(
      //       'All remaining transactions are older than cutoff. Stopping restore.',
      //     );
      //     break;
      //   }

      //   restoredTxs.push(...recentTxs);
      //   start += BATCH_SIZE;
      // }

      // const updatedTxs = [];
      if (!updatedTxs.length) return { updated: [] };

      // for (const tx of restoredTxs) {
      //   const saved = savedMap.get(tx.id);
      //   if (!saved) return;
      //   const status = getSparkPaymentStatus(tx.status);

      //   if (status !== saved.paymentStatus)
      //     updatedTxs.push({
      //       ...saved,
      //       paymentStatus: status,
      //       id: tx.id,
      //       details: JSON.parse(saved.details),
      //     }); // update existing tx with new status
      // }

      await bulkUpdateSparkTransactions(updatedTxs);

      // console.log(`Total restored transactions: ${restoredTxs.length}`);
      console.log(`Updated transactions:`, updatedTxs);

      return { updated: updatedTxs };
    } catch (error) {
      console.error("Error in spark restore:", error);
      return { updated: [] };
    }
  };

export async function fullRestoreSparkState({ sparkAddress }) {
  try {
    const restored = await restoreSparkTxState(50);

    const newPaymentObjects = [];

    for (const tx of restored.txs) {
      const paymentObject = await transformTxToPaymentObject(
        tx,
        sparkAddress,
        undefined,
        true
      );
      if (paymentObject) {
        newPaymentObjects.push(paymentObject);
      }
    }

    if (newPaymentObjects.length) {
      // Update DB state of payments but dont hold up thread
      await bulkUpdateSparkTransactions(newPaymentObjects);
    }

    return { num: newPaymentObjects.length, txs: newPaymentObjects };
  } catch (err) {
    console.log("full restore spark state error", err);
    return false;
  }
}
