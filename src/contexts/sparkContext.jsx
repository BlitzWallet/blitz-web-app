import {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useRef,
} from "react";

import { sparkReceivePaymentWrapper } from "../functions/spark/payments";
import { breezLiquidPaymentWrapper } from "../functions/breezLiquid";
import {
  claimnSparkStaticDepositAddress,
  getSparkBalance,
  getSparkLightningPaymentStatus,
  getSparkStaticBitcoinL1AddressQuote,
  getSparkTransactions,
  queryAllStaticDepositAddresses,
  sparkWallet,
  useSparkPaymentType,
} from "../functions/spark";
import {
  addSingleSparkTransaction,
  bulkUpdateSparkTransactions,
  deleteUnpaidSparkLightningTransaction,
  getAllSparkTransactions,
  getAllUnpaidSparkLightningInvoices,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "../functions/spark/transactions";
import {
  fullRestoreSparkState,
  restoreSparkTxState,
  updateSparkTxStatus,
} from "../functions/spark/restore";
import { useGlobalContacts } from "./globalContacts";
import { initWallet } from "../functions/initiateWalletConnection";
import { useAppStatus } from "./appStatus";
import { useNodeContext } from "./nodeContext";
import { calculateBoltzFeeNew } from "../functions/boltz/boltzFeeNew";
import Storage from "../functions/localStorage";
import { useAuth } from "./authContext";
import getDepositAddressTxIds, {
  handleTxIdState,
} from "../functions/spark/getDepositAddressTxIds";

// Initiate context
const SparkWalletManager = createContext(null);

const SparkWalletProvider = ({ children, navigate }) => {
  const { didGetToHomepage, minMaxLiquidSwapAmounts } = useAppStatus();
  const { liquidNodeInformation } = useNodeContext();
  const { mnemoinc } = useAuth();
  const [sparkInformation, setSparkInformation] = useState({
    balance: 0,
    transactions: [],
    identityPubKey: "",
    sparkAddress: "",
    didConnect: null,
  });
  const { toggleGlobalContactsInformation, globalContactsInformation } =
    useGlobalContacts();
  const [numberOfIncomingLNURLPayments, setNumberOfIncomingLNURLPayments] =
    useState(0);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const depositAddressIntervalRef = useRef(null);
  const restoreOffllineStateRef = useRef(null);
  const sparkPaymentActionsRef = useRef(null);
  const handlePaymentUpdatedDbounceTimeoutRef = useRef(null);
  const [blockedIdentityPubKeys, setBlockedIdentityPubKeys] = useState([]);
  const blockedIdentityPubKeysRef = useRef([]);
  const isFirstSparkUpdateStateInterval = useRef(true);
  const [numberOfCachedTxs, setNumberOfCachedTxs] = useState(0);
  const [numberOfConnectionTries, setNumberOfConnectionTries] = useState(0);
  const [startConnectingToSpark, setStartConnectingToSpark] = useState(false);

  useEffect(() => {
    blockedIdentityPubKeysRef.current = blockedIdentityPubKeys;
  }, [blockedIdentityPubKeys]);

  // This is a function that handles incoming transactions and formmataes it to reqirued formation
  const handleTransactionUpdate = async (recevedTxId) => {
    try {
      // First we need to get recent spark transfers
      const transactions = await getSparkTransactions(5, undefined);
      if (!transactions)
        throw new Error("Unable to get transactions from spark");

      const { transfers } = transactions;
      const selectedSparkTransaction = transfers.find(
        (tx) => tx.id === recevedTxId
      );

      console.log(
        selectedSparkTransaction,
        "received transaction from spark tx list"
      );
      let paymentObject = {};
      const paymentType = useSparkPaymentType(selectedSparkTransaction);

      if (paymentType === "lightning") {
        const unpaidInvoices = await getAllUnpaidSparkLightningInvoices();
        console.log(unpaidInvoices);
        const posibleOptions = unpaidInvoices.filter(
          (unpaidInvoice) =>
            unpaidInvoice.amount == selectedSparkTransaction.totalValue
        );

        let matchedUnpaidInvoice = null;
        let savedInvoice = null;
        for (const invoice of posibleOptions) {
          console.log("Checking invoice", invoice);

          let paymentDetials;
          let attempts = 0;

          // Try up to 5 times with 1 second delay if transfer is undefined
          while (attempts < 5) {
            const result = await getSparkLightningPaymentStatus({
              lightningInvoiceId: invoice.sparkID,
            });

            // If transfer is defined, assign and break out of while loop
            if (result?.transfer) {
              paymentDetials = result;
              break;
            }

            // Wait 1 second before next attempt
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
          }

          // If paymentDetials is still undefined after 5 tries, continue to next invoice
          if (!paymentDetials || !paymentDetials.transfer) continue;

          console.log(paymentDetials, "payment details");

          if (paymentDetials.transfer.sparkId === recevedTxId) {
            savedInvoice = invoice;
            matchedUnpaidInvoice = paymentDetials;
            break;
          }
        }

        if (savedInvoice) {
          // removes invoice from the unpaid list
          deleteUnpaidSparkLightningTransaction(savedInvoice.sparkID);
        }

        paymentObject = {
          id: recevedTxId,
          paymentStatus: "completed",
          paymentType: "lightning",
          accountId: selectedSparkTransaction.receiverIdentityPublicKey,
          details: {
            fee: 0,
            amount: selectedSparkTransaction.totalValue,
            address: matchedUnpaidInvoice?.invoice?.encodedInvoice || "",
            time: new Date().getTime(),
            direction: "INCOMING",
            description: savedInvoice?.description || "",
            preimage: matchedUnpaidInvoice?.paymentPreimage || "",
            shouldNavigate:
              savedInvoice?.shouldNavigate === undefined
                ? 0 //if not specified navigate to confirm screen
                : savedInvoice?.shouldNavigate,
          },
        };
        console.log("lightning payment object", paymentObject);
      } else if (paymentType === "spark") {
        paymentObject = {
          id: recevedTxId,
          paymentStatus: "completed",
          paymentType: "spark",
          accountId: selectedSparkTransaction.receiverIdentityPublicKey,
          details: {
            fee: 0,
            amount: selectedSparkTransaction.totalValue,
            address: sparkInformation.sparkAddress,
            time: new Date().getTime(),
            direction: "INCOMING",
            senderIdentityPublicKey:
              selectedSparkTransaction.senderIdentityPublicKey,
            description: "",
          },
        };
      } else {
        //Don't need to do anything here for bitcoin This gets hanldes by the payment state update which will turn it from pending to confirmed once one confirmation happens
      }

      if (!selectedSparkTransaction)
        throw new Error("Not able to get recent transfer");

      await bulkUpdateSparkTransactions([paymentObject]);

      const savedTxs = await getAllSparkTransactions();

      return { txs: savedTxs, paymentObject };
    } catch (err) {
      console.log("Handle incoming transaction error", err);
    }
  };

  const handleIncomingPayment = async (transferId) => {
    let storedTransaction = await handleTransactionUpdate(transferId);

    // block incoming paymetns here
    // console.log(blockedIdentityPubKeysRef.current, 'blocked identy puib keys');
    // const isLNURLPayment = blockedIdentityPubKeysRef.current.find(
    //   blocked => blocked.transferResponse.id === transferId,
    // );
    const selectedStoredPayment = storedTransaction.txs.find(
      (tx) => tx.sparkID === transferId
    );
    console.log(selectedStoredPayment, "seleceted stored transaction");
    // console.log(isLNURLPayment, 'isLNURL PAYMNET');
    // if (!!isLNURLPayment) {
    //   const dbLNURL = isLNURLPayment.db;

    //   const newPayent = {
    //     ...selectedStoredPayment,
    //     details: {description: dbLNURL.description},
    //     id: selectedStoredPayment.sparkID,
    //   };

    //   await bulkUpdateSparkTransactions([newPayent]);

    // }
    const details = JSON.parse(selectedStoredPayment.details);

    if (details?.shouldNavigate) return;
    if (details.isRestore) return;
    // Handle confirm animation here
    navigate("/confirm-page", {
      state: {
        for: "invoicePaid",
        transaction: { ...selectedStoredPayment, details },
      },
    });
  };

  // Add event listeners to listen for bitcoin and lightning or spark transfers when receiving does not handle sending
  useEffect(() => {
    const handleUpdate = async (updateType) => {
      try {
        console.log("Running update from DB changes:", updateType);

        const txs = await getAllSparkTransactions();

        if (updateType === "blocked") {
          setSparkInformation((prev) => ({
            ...prev,
            transactions: txs || prev.transactions,
          }));
        } else {
          const balance = await getSparkBalance();

          setSparkInformation((prev) => ({
            ...prev,
            balance: balance?.balance || prev.balance,
            transactions: txs || prev.transactions,
          }));
        }
      } catch (err) {
        console.error("Error in handleUpdate:", err);
      }
    };
    const handleUpdateDebouce = (updateType) => {
      if (handlePaymentUpdatedDbounceTimeoutRef.current) {
        clearTimeout(handlePaymentUpdatedDbounceTimeoutRef.current);
      }
      // Set new timeout for debounced execution (500ms delay)
      handlePaymentUpdatedDbounceTimeoutRef.current = setTimeout(() => {
        handleUpdate(updateType);
      }, 1000);
    };

    const transferHandler = (transferId, balance) => {
      console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);
      handleIncomingPayment(transferId);
    };

    const addListeners = async () => {
      console.log("Adding Spark listeners...");
      sparkTransactionsEventEmitter.on(
        SPARK_TX_UPDATE_ENVENT_NAME,
        handleUpdateDebouce
      );
      sparkWallet.on("transfer:claimed", transferHandler);
      // sparkWallet.on("deposit:confirmed", transferHandler);
      if (!sparkPaymentActionsRef.current) {
        console.log("blocking first listeners run");
        sparkPaymentActionsRef.current = true;
        return;
      }
      await new Promise((res) => setTimeout(res, 1000));
      const restored = await fullRestoreSparkState({
        sparkAddress: sparkInformation.sparkAddress,
      });
      console.log(restored, "restore resposne");
      if (!restored.txs.length) return;
      navigate("/confirm-page", {
        state: {
          for: "invoicePaid",
          transaction: restored.txs[0],
        },
      });
    };

    const removeListeners = () => {
      console.log("Removing Spark listeners");
      sparkTransactionsEventEmitter.removeAllListeners(
        SPARK_TX_UPDATE_ENVENT_NAME
      );
      sparkWallet.removeAllListeners("transfer:claimed");
      // sparkWallet.off("deposit:confirmed", transferHandler);
    };
    const handleTabBlur = () => removeListeners();
    const handleTabFocus = () => addListeners();
    const handleBeforeUnload = () => removeListeners();

    if (!sparkInformation.didConnect) return;

    addListeners();
    window.addEventListener("blur", handleTabBlur);
    window.addEventListener("focus", handleTabFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);
    sparkTransactionsEventEmitter.on(SPARK_TX_UPDATE_ENVENT_NAME, handleUpdate);
    // // Called when tab visibility changes
    // const handleVisibilityChange = () => {
    //   if (document.visibilityState === "visible") {
    //     addListeners();
    //   } else {
    //     removeListeners();
    //   }
    // };

    // // Initial listener add (e.g. when component mounts)
    // if (document.visibilityState === "visible") {
    //   addListeners();
    // }

    // document.addEventListener("visibilitychange", handleVisibilityChange);

    // addListeners();
    // // Clean up on unmount
    return () => {
      removeListeners();
      // document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sparkInformation.didConnect]);

  // useEffect(() => {
  //   if (!sparkInformation.didConnect) return;

  //   const handleUpdate = async (updateType) => {
  //     try {
  //       console.log(
  //         "running update in spark context from db changes",
  //         updateType
  //       );
  //       const balance = (await getSparkBalance()) || { balance: 0 };
  //       const txs = await getAllSparkTransactions();
  //       setSparkInformation((prev) => ({
  //         ...prev,
  //         balance: balance.balance,
  //         transactions: txs ? txs : prev.transactions,
  //       }));
  //     } catch (err) {
  //       console.log("error in spark handle db update function", err);
  //     }
  //   };

  //   const transferHandler = (transferId, balance) => {
  //     console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);
  //     handleIncomingPayment(transferId);
  //   };

  //   const addListeners = () => {
  //     if (sparkPaymentActionsRef.current) return;
  //     sparkPaymentActionsRef.current = true;
  //     console.log("Adding spark listeners");

  //     sparkTransactionsEventEmitter.on(
  //       SPARK_TX_UPDATE_ENVENT_NAME,
  //       handleUpdate
  //     );
  //     sparkWallet.on("transfer:claimed", transferHandler);
  //     sparkWallet.on("deposit:confirmed", transferHandler);
  //   };

  //   const removeListeners = () => {
  //     if (!sparkPaymentActionsRef.current) return;
  //     sparkPaymentActionsRef.current = false;
  //     console.log("Removing spark listeners");

  //     sparkTransactionsEventEmitter.off(
  //       SPARK_TX_UPDATE_ENVENT_NAME,
  //       handleUpdate
  //     );
  //     sparkWallet.off("transfer:claimed", transferHandler);
  //     sparkWallet.off("deposit:confirmed", transferHandler);
  //   };

  //   const handleAppStateChange = (nextAppState) => {
  //     console.log(nextAppState);
  //     if (nextAppState === "active") {
  //       addListeners();
  //     } else if (nextAppState.match(/inactive|background/)) {
  //       removeListeners();
  //     }
  //   };

  //   AppState.addEventListener("change", handleAppStateChange);

  //   // Add on mount if app is already active
  //   if (AppState.currentState === "active") {
  //     addListeners();
  //   }
  // }, [sparkInformation.didConnect]);
  // Storage.removeItem("depositAddressTxIds");
  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    // Interval to check deposit addresses to see if they were paid
    const handleDepositAddressCheck = async () => {
      try {
        console.log("l1Deposit check running....");
        const allTxs = await getAllSparkTransactions();
        const savedTxMap = new Map(allTxs.map((tx) => [tx.sparkID, tx]));
        const depoistAddress = await queryAllStaticDepositAddresses();

        // Loop through deposit addresses and check if they have been paid
        for (const address of depoistAddress) {
          console.log("Checking deposit address:", address);
          if (!address) continue;

          // Get new txids for an address
          const txids = await getDepositAddressTxIds(address);
          console.log("Deposit address txids:", txids);
          if (!txids || !txids.length) continue;
          const unpaidTxids = txids.filter((txid) => !txid.didClaim);
          let claimedTxs = Storage.getItem("claimedBitcoinTxs") || [];

          for (const txid of unpaidTxids) {
            // get quote for the txid
            const { didwork, quote, error } =
              await getSparkStaticBitcoinL1AddressQuote(txid.txid);

            console.log("Deposit address quote:", quote);
            if (!didwork) {
              console.log(error, "Error getting deposit address quote");
              if (error.includes("UTXO is spent or not found.")) {
                handleTxIdState(txid, true, address);
              }

              continue;
            }

            if (claimedTxs?.includes(quote.signature)) {
              handleTxIdState(txid, true, address);
              continue;
            }
            const hasAlreadySaved = savedTxMap.has(quote.transactionId);
            console.log("Has already saved transaction:", hasAlreadySaved);
            if (!hasAlreadySaved) {
              const pendingTx = {
                id: quote.transactionId,
                paymentStatus: "pending",
                paymentType: "bitcoin",
                accountId: sparkInformation.identityPubKey,
                details: {
                  fee: 0,
                  amount: quote.creditAmountSats,
                  address: address,
                  time: new Date().getTime(),
                  direction: "INCOMING",
                  description: "Deposit address payment",
                  onChainTxid: quote.transactionId,
                  isRestore: true, // This is a restore payment
                },
              };
              await addSingleSparkTransaction(pendingTx);
            }

            // If the address has been paid, claim the transaction
            const claimTx = await claimnSparkStaticDepositAddress({
              ...quote,
              sspSignature: quote.signature,
            });
            if (!claimTx) continue;
            console.log("Claimed deposit address transaction:", claimTx);

            if (!claimedTxs?.includes(quote.signature)) {
              claimedTxs.push(quote.signature);
              Storage.setItem("claimedBitcoinTxs", claimedTxs);
            }

            await new Promise((res) => setTimeout(res, 2000));
            // query latest 10 transacctions for sparkID of the claim tx response
            // update paymetn detials
            const incomingTxs = await getSparkTransactions(10);
            const bitcoinTransfer = incomingTxs.transfers.find(
              (tx) => tx.id === claimTx.transferId
            );

            const updatedTx = bitcoinTransfer
              ? {
                  useTempId: true,
                  tempId: quote.transactionId,
                  id: bitcoinTransfer.id,
                  paymentStatus: "completed",
                  paymentType: "bitcoin",
                  accountId: sparkInformation.identityPubKey,
                  details: {
                    amount: bitcoinTransfer.totalValue,
                    fee: Math.abs(
                      quote.creditAmountSats - bitcoinTransfer.totalValue
                    ),
                  },
                }
              : {
                  useTempId: true,
                  id: claimTx.transferId,
                  tempId: quote.transactionId,
                  paymentStatus: "pending",
                  paymentType: "bitcoin",
                  accountId: sparkInformation.identityPubKey,
                };

            await bulkUpdateSparkTransactions([updatedTx]);
            console.log("Updated bitcoin transaction:", updatedTx);
          }
        }
      } catch (err) {
        console.log("Handle deposit address check error", err);
      }
    };

    if (depositAddressIntervalRef.current) {
      clearInterval(depositAddressIntervalRef.current);
    }
    handleDepositAddressCheck();
    depositAddressIntervalRef.current = setInterval(
      handleDepositAddressCheck,
      10_000 * 60 //run every 5 minutes since that is the average block time
    );
  }, [sparkInformation.didConnect]);

  useEffect(() => {
    // This function runs once per load and check to see if a user received any payments while offline. It also starts a timeout to update payment status of paymetns every 30 seconds.
    if (!sparkInformation.didConnect) return;
    if (restoreOffllineStateRef.current) return;
    restoreOffllineStateRef.current = true;

    let intervalId = null;

    const startInterval = () => {
      if (intervalId) return;
      console.log("Starting spark update interval");
      updateSparkTxStatus(50, isFirstSparkUpdateStateInterval.current);
      intervalId = setInterval(async () => {
        try {
          console.log(
            "Is first interval",
            isFirstSparkUpdateStateInterval.current
          );
          await updateSparkTxStatus(
            50,
            isFirstSparkUpdateStateInterval.current
          );
          isFirstSparkUpdateStateInterval.current = false;
        } catch (err) {
          console.error("Error during periodic restore:", err);
        }
      }, 10 * 1000); //ten second intervals
    };

    // Run restore logic once
    const restoreTxState = async () => {
      console.log("RUNNING RESTORE");
      // const isFirstWalletLoad = Storage.getItem("isFirstWalletLoad");
      // if (isFirstWalletLoad === "true") return;
      // Storage.setItem(isFirstWalletLoad, "true");
      await fullRestoreSparkState({
        sparkAddress: sparkInformation.sparkAddress,
      });
    };
    restoreTxState();
    startInterval();
  }, [sparkInformation.didConnect]);

  // This function connects to the spark node and sets the session up
  useEffect(() => {
    async function initProcess() {
      const { didWork } = await initWallet({
        setSparkInformation,
        toggleGlobalContactsInformation,
        globalContactsInformation,
        mnemoinc,
      });

      if (didWork) return;
      setNumberOfConnectionTries((prev) => (prev += 1));
      await new Promise(() => initProcess(), 2000);
    }
    if (!startConnectingToSpark) return;
    initProcess();
  }, [startConnectingToSpark]);

  // This function checks to see if there are any liquid funds that need to be sent to spark
  useEffect(() => {
    async function swapLiquidToSpark() {
      try {
        console.log(
          liquidNodeInformation.userBalance,
          minMaxLiquidSwapAmounts.min
        );
        if (liquidNodeInformation.userBalance > minMaxLiquidSwapAmounts.min) {
          const liquidFee = calculateBoltzFeeNew(
            liquidNodeInformation.userBalance,
            "liquid-ln",
            minMaxLiquidSwapAmounts.submarineSwapStats
          );
          console.log(liquidFee);
          const feeBuffer = liquidFee * 3.5;

          const sendAmount = Math.round(
            liquidNodeInformation.userBalance - feeBuffer
          );
          console.log(liquidFee, "liquid fee");
          console.log(sendAmount, "send amount");
          console.log(liquidNodeInformation.userBalance, "user balance");
          if (sendAmount < minMaxLiquidSwapAmounts.min) return;

          const sparkLnReceiveAddress = await sparkReceivePaymentWrapper({
            amountSats: sendAmount,
            memo: "Liquid to Spark Swap",
            paymentType: "lightning",
          });

          if (!sparkLnReceiveAddress.didWork) return;

          await breezLiquidPaymentWrapper({
            paymentType: "lightning",
            sendAmount: sendAmount,
            invoice: sparkLnReceiveAddress.invoice,
          });
        }
      } catch (err) {
        console.log("transfering liquid to spark error", err);
      }
    }
    console.log(
      liquidNodeInformation,
      minMaxLiquidSwapAmounts,
      sparkInformation.didConnect,
      "testing in sspark"
    );

    if (!sparkInformation.didConnect) return;
    swapLiquidToSpark();
  }, [
    liquidNodeInformation,
    minMaxLiquidSwapAmounts,
    sparkInformation.didConnect,
  ]);

  const contextValue = useMemo(
    () => ({
      sparkInformation,
      setSparkInformation,
      setBlockedIdentityPubKeys,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,
      numberOfCachedTxs,
      setNumberOfCachedTxs,
      setStartConnectingToSpark,
    }),
    [
      sparkInformation,
      setSparkInformation,
      setBlockedIdentityPubKeys,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,
      numberOfCachedTxs,
      setNumberOfCachedTxs,
      setStartConnectingToSpark,
    ]
  );

  return (
    <SparkWalletManager.Provider value={contextValue}>
      {children}
    </SparkWalletManager.Provider>
  );
};

function useSpark() {
  const context = useContext(SparkWalletManager);
  if (!context) {
    throw new Error("useSparkWallet must be used within a SparkWalletProvider");
  }
  return context;
}

export { SparkWalletManager, SparkWalletProvider, useSpark };
