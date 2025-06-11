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
  claimSparkBitcoinL1Transaction,
  getSparkBalance,
  getSparkLightningPaymentStatus,
  getSparkStaticBitcoinL1Address,
  getSparkTransactions,
  getUnusedSparkBitcoinL1Address,
  querySparkBitcoinL1Transaction,
  sparkWallet,
  useSparkPaymentType,
} from "../functions/spark";
import {
  bulkUpdateSparkTransactions,
  deleteUnpaidSparkLightningTransaction,
  getAllSparkTransactions,
  getAllUnpaidSparkLightningInvoices,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "../functions/spark/transactions";
import {
  fullRestoreSparkState,
  updateSparkTxStatus,
} from "../functions/spark/restore";
import { useGlobalContacts } from "./globalContacts";
import { initWallet } from "../functions/initiateWalletConnection";
import { useAppStatus } from "./appStatus";
import { useNodeContext } from "./nodeContext";
import { calculateBoltzFeeNew } from "../functions/boltz/boltzFeeNew";
import Storage from "../functions/localStorage";
import { useAuth } from "./authContext";

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
            if (result?.transfer !== undefined) {
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
    console.log(selectedStoredPayment, "testing");
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
    if (!sparkInformation.didConnect) return;

    const handleUpdate = async (updateType) => {
      try {
        console.log("Running update from DB changes:", updateType);
        const balance = (await getSparkBalance()) || { balance: 0 };
        const txs = await getAllSparkTransactions();
        setSparkInformation((prev) => ({
          ...prev,
          balance: balance.balance,
          transactions: txs || prev.transactions,
        }));
      } catch (err) {
        console.error("Error in handleUpdate:", err);
      }
    };

    const transferHandler = (transferId, balance) => {
      console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);
      handleIncomingPayment(transferId);
    };

    const addListeners = () => {
      if (sparkPaymentActionsRef.current) return;
      sparkPaymentActionsRef.current = true;
      console.log("Adding Spark listeners");

      sparkTransactionsEventEmitter.on(
        SPARK_TX_UPDATE_ENVENT_NAME,
        handleUpdate
      );
      sparkWallet.on("transfer:claimed", transferHandler);
      sparkWallet.on("deposit:confirmed", transferHandler);
    };

    // const removeListeners = () => {
    //   if (!sparkPaymentActionsRef.current) return;
    //   sparkPaymentActionsRef.current = false;
    //   console.log("Removing Spark listeners");

    //   sparkTransactionsEventEmitter.off(
    //     SPARK_TX_UPDATE_ENVENT_NAME,
    //     handleUpdate
    //   );
    //   sparkWallet.off("transfer:claimed", transferHandler);
    //   sparkWallet.off("deposit:confirmed", transferHandler);
    // };

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

    addListeners();
    // // Clean up on unmount
    // return () => {
    //   removeListeners();
    //   document.removeEventListener("visibilitychange", handleVisibilityChange);
    // };
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

  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    // Interval to check deposit addresses to see if they were paid
    const handleDepositAddressCheck = async () => {
      try {
        console.log("l1Deposit check running....");
        const depoistAddress = await getSparkStaticBitcoinL1Address();

        console.log("Deposit address:", depoistAddress);
        if (!depoistAddress) return;

        const txid = await querySparkBitcoinL1Transaction(depoistAddress);
        console.log(txid);
        //     if (!response.filter(Boolean).length) return false;
        //     const [txid, [data]] = response;
        //     const formattedTx = await transformTxToPaymentObject(
        //       {
        //         ...data,
        //         transferDirection: 'INCOMING',
        //         address: address,
        //         txid: txid,
        //       },
        //       '',
        //       'bitcoin',
        //     );

        // const filteredTxs = newTransactions.filter(Boolean);

        // if (filteredTxs.length) {
        //   await bulkUpdateSparkTransactions(filteredTxs);
        // }
      } catch (err) {
        console.log("Handle deposit address check error", err);
      }
    };

    if (depositAddressIntervalRef.current) {
      clearInterval(depositAddressIntervalRef.current);
    }

    depositAddressIntervalRef.current = setInterval(
      handleDepositAddressCheck,
      1_000 * 60
    );
  }, [sparkInformation.didConnect]);

  useEffect(() => {
    // This function runs once per load and check to see if a user received any payments while offline. It also starts a timeout to update payment status of paymetns every 30 seconds.
    if (!sparkInformation.didConnect || !didGetToHomepage) return;
    if (restoreOffllineStateRef.current) return;
    restoreOffllineStateRef.current = true;

    let intervalId = null;

    const startInterval = () => {
      if (intervalId) return;
      console.log("Starting spark update interval");
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
      }, 100000); //one minute intervals
    };

    const clearIntervalIfNeeded = () => {
      if (intervalId) {
        console.log("Clearing spark update interval");
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        startInterval();
      } else if (nextAppState.match(/inactive|background/)) {
        clearIntervalIfNeeded();
      }
    };

    // Run restore logic once
    const restoreTxState = async () => {
      const isFirstWalletLoad = Storage.getItem("isFirstWalletLoad");
      if (isFirstWalletLoad === "true") return;
      Storage.setItem(isFirstWalletLoad, "true");
      await fullRestoreSparkState({
        sparkAddress: sparkInformation.sparkAddress,
      });
    };
    restoreTxState();

    // Start interval immediately if app is active
    if (AppState.currentState === "active") {
      startInterval();
    }

    AppState.addEventListener("change", handleAppStateChange);
  }, [didGetToHomepage, sparkInformation.didConnect]);

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
      didGetToHomepage,
      liquidNodeInformation,
      minMaxLiquidSwapAmounts,
      sparkInformation.didConnect,
      "testing in sspark"
    );
    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    swapLiquidToSpark();
  }, [
    didGetToHomepage,
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
