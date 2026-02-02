import {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  claimnSparkStaticDepositAddress,
  getCachedSparkTransactions,
  getSingleTxDetails,
  getSparkBalance,
  getSparkLightningPaymentStatus,
  getSparkStaticBitcoinL1AddressQuote,
  getSparkTransactions,
  getUtxosForDepositAddress,
  queryAllStaticDepositAddresses,
  sparkWallet,
  useSparkPaymentType,
} from "../functions/spark";
import {
  addSingleSparkTransaction,
  bulkUpdateSparkTransactions,
  deleteUnpaidSparkLightningTransaction,
  getAllSparkContactInvoices,
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
import EventEmitter from "events";
import { transformTxToPaymentObject } from "../functions/spark/transformTxToPayment";
import { useKeysContext } from "./keysContext";
import liquidToSparkSwap from "../functions/spark/liquidToSparkSwap";
import { useActiveCustodyAccount } from "./activeAccount";
import sha256Hash from "../functions/hash";
import { getLRC20Transactions } from "../functions/lrc20";
import { useGlobalContextProvider } from "./masterInfoObject";
import handleBalanceCache from "../functions/spark/handleBalanceCache";
import {
  createBalancePoller,
  createRestorePoller,
} from "../functions/pollingManager";
import i18next from "i18next";
import { useLocation } from "react-router-dom";

export const isSendingPayingEventEmiiter = new EventEmitter();
export const SENDING_PAYMENT_EVENT_NAME = "SENDING_PAYMENT_EVENT";

if (!globalThis.blitzWalletSparkIntervalState) {
  globalThis.blitzWalletSparkIntervalState = {
    intervalTracker: new Map(),
    listenerLock: new Map(),
    allIntervalIds: new Set(),
    depositIntervalIds: new Set(),
  };
}
const { intervalTracker, listenerLock, allIntervalIds, depositIntervalIds } =
  globalThis.blitzWalletSparkIntervalState;

// Initiate context
const SparkWalletManager = createContext(null);
const sessionTime = new Date().getTime();

const SparkWalletProvider = ({ children, navigate }) => {
  const location = useLocation();
  const { masterInfoObject } = useGlobalContextProvider();
  const { accountMnemoinc, contactsPrivateKey, publicKey } = useKeysContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { didGetToHomepage, minMaxLiquidSwapAmounts, appState } =
    useAppStatus();
  const { toggleGlobalContactsInformation, globalContactsInformation } =
    useGlobalContacts();
  const prevAccountMnemoincRef = useRef(null);
  const [sparkConnectionError, setSparkConnectionError] = useState(null);
  const [sparkInformation, setSparkInformation] = useState({
    balance: 0,
    transactions: [],
    identityPubKey: "",
    sparkAddress: "",
    didConnect: null,
  });
  const [tokensImageCache, setTokensImageCache] = useState({});
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const hasRestoreCompleted = useRef(false);
  const [restoreCompleted, setRestoreCompleted] = useState(false);
  const [reloadNewestPaymentTimestamp, setReloadNewestPaymentTimestamp] =
    useState(0);
  const depositAddressIntervalRef = useRef(null);
  const sparkDBaddress = useRef(null);
  const updatePendingPaymentsIntervalRef = useRef(null);
  const isInitialRestore = useRef(true);
  const isInitialLRC20Run = useRef(true);
  const sparkInfoRef = useRef({
    balance: 0,
    tokens: {},
    identityPubKey: "",
    sparkAddress: "",
  });
  const sessionTimeRef = useRef(Date.now());
  const newestPaymentTimeRef = useRef(Date.now());
  const handledTransfers = useRef(new Set());
  const usedSavedTxIds = useRef(new Set());
  const prevAccountId = useRef(null);
  const isSendingPaymentRef = useRef(false);
  const balancePollingTimeoutRef = useRef(null);
  const balancePollingAbortControllerRef = useRef(null);
  const txPollingTimeoutRef = useRef(null);
  const txPollingAbortControllerRef = useRef(null);
  const currentPollingMnemonicRef = useRef(null);
  const isInitialRender = useRef(true);
  const didInitializeSendingPaymentEvent = useRef(false);
  const initialBitcoinIntervalRun = useRef(null);
  const prevAppState = useRef(appState);
  const prevListenerType = useRef(null);

  const showTokensInformation =
    masterInfoObject.enabledBTKNTokens === null
      ? !!Object.keys(sparkInformation.tokens || {}).length
      : masterInfoObject.enabledBTKNTokens;

  const didRunInitialRestore = useRef(false);

  const handledNavigatedTxs = useRef(new Set());

  const [didRunNormalConnection, setDidRunNormalConnection] = useState(false);
  const [normalConnectionTimeout, setNormalConnectionTimeout] = useState(false);
  const shouldRunNormalConnection =
    didRunNormalConnection || normalConnectionTimeout;
  const currentMnemonicRef = useRef(currentWalletMnemoinc);

  const [numberOfIncomingLNURLPayments, setNumberOfIncomingLNURLPayments] =
    useState(0);
  const [numberOfConnectionTries, setNumberOfConnectionTries] = useState(0);

  const cleanStatusAndLRC20Intervals = () => {
    try {
      for (const intervalId of allIntervalIds) {
        console.log("Clearing stored interval ID:", intervalId);
        clearInterval(intervalId);
      }

      intervalTracker.clear();
      allIntervalIds.clear();
    } catch (err) {
      console.log("Error cleaning lrc20 intervals", err);
    }
  };

  const clearAllDepositIntervals = () => {
    console.log(
      "Clearing all deposit address intervals. Counts:",
      depositIntervalIds.size,
    );

    for (const intervalId of depositIntervalIds) {
      console.log("Clearing deposit interval ID:", intervalId);
      clearInterval(intervalId);
    }

    depositIntervalIds.clear();
    console.log("All deposit intervals cleared");
  };

  useEffect(() => {
    sparkInfoRef.current = {
      balance: sparkInformation.balance,
      tokens: sparkInformation.tokens,
      identityPubKey: sparkInformation.identityPubKey,
      sparkAddress: sparkInformation.sparkAddress,
    };
  }, [
    sparkInformation.balance,
    sparkInformation.tokens,
    sparkInformation.identityPubKey,
    sparkInformation.sparkAddress,
  ]);

  const sessionTime = useMemo(() => {
    console.log("Updating wallet session time", currentWalletMnemoinc);
    return Date.now();
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    currentMnemonicRef.current = currentWalletMnemoinc;
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    // Fixing race condition with new preloaded txs
    sessionTimeRef.current = Date.now() + 5 * 1000;
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    newestPaymentTimeRef.current = Date.now();
  }, [reloadNewestPaymentTimestamp]);

  useEffect(() => {
    if (!sparkInfoRef.current?.tokens) return;

    async function updateTokensImageCache() {
      const availableAssets = Object.entries(sparkInfoRef.current.tokens);
      const extensions = ["jpg", "png"];
      const newCache = {};

      for (const [tokenId] of availableAssets) {
        newCache[tokenId] = null;

        for (const ext of extensions) {
          const url = `https://tokens.sparkscan.io/${tokenId}.${ext}`;
          try {
            const response = await fetch(url, { method: "HEAD" });
            if (response.ok) {
              newCache[tokenId] = url;
              break;
            }
          } catch (err) {
            console.log("Image fetch error:", tokenId, err);
          }
        }
      }

      setTokensImageCache(newCache);
    }

    updateTokensImageCache();
  }, [Object.keys(sparkInformation.tokens || {}).length]);

  // Debounce refs
  const debounceTimeoutRef = useRef(null);
  const pendingTransferIds = useRef(new Set());

  const toggleIsSendingPayment = useCallback((isSending) => {
    console.log("Setting is sending payment", isSending);
    if (isSending) {
      if (txPollingAbortControllerRef.current) {
        txPollingAbortControllerRef.current.abort();
        txPollingAbortControllerRef.current = null;
      }
    }
    isSendingPaymentRef.current = isSending;
  }, []);

  const toggleNewestPaymentTimestamp = () => {
    setReloadNewestPaymentTimestamp((prev) => prev + 1);
  };

  useEffect(() => {
    if (
      !isSendingPayingEventEmiiter.listenerCount(SENDING_PAYMENT_EVENT_NAME)
    ) {
      isSendingPayingEventEmiiter.addListener(
        SENDING_PAYMENT_EVENT_NAME,
        toggleIsSendingPayment,
      );
    }

    return () => {
      console.log("clearning up toggle send pament");
      isSendingPayingEventEmiiter.removeListener(
        SENDING_PAYMENT_EVENT_NAME,
        toggleIsSendingPayment,
      );
    };
  }, [toggleIsSendingPayment]);

  const debouncedHandleIncomingPayment = useCallback(async (balance) => {
    if (pendingTransferIds.current.size === 0) return;

    const transferIdsToProcess = Array.from(pendingTransferIds.current);
    pendingTransferIds.current.clear();

    console.log(
      "Processing debounced incoming payments:",
      transferIdsToProcess,
    );
    // let transfersOffset = 0;
    let cachedTransfers = [];

    for (const transferId of transferIdsToProcess) {
      try {
        const transfer = await getSingleTxDetails(
          currentMnemonicRef.current,
          transferId,
        );

        if (!transfer) continue;
        cachedTransfers.push(transfer);
      } catch (error) {
        console.error("Error processing incoming payment:", transferId, error);
      }
    }

    const paymentObjects = [];

    const [unpaidInvoices, unpaidContactInvoices] = await Promise.all([
      getAllUnpaidSparkLightningInvoices(),
      getAllSparkContactInvoices(),
    ]);

    for (const transferId of transferIdsToProcess) {
      const tx = cachedTransfers.find((t) => t.id === transferId);
      if (!tx) continue;

      // Skip UTXO_SWAP handling here — old logic kept
      if (tx.type === "UTXO_SWAP") continue;

      const paymentObj = await transformTxToPaymentObject(
        tx,
        sparkInfoRef.current.sparkAddress,
        undefined,
        false,
        unpaidInvoices,
        sparkInfoRef.current.identityPubKey,
        1,
        undefined,
        unpaidContactInvoices,
      );

      if (paymentObj) {
        paymentObjects.push(paymentObj);
      }
    }

    if (!paymentObjects.length) {
      handleBalanceCache({
        isCheck: false,
        passedBalance: balance,
        mnemonic: currentMnemonicRef.current,
      });
      setSparkInformation((prev) => ({
        ...prev,
        balance: balance,
      }));
      return;
    }

    try {
      await bulkUpdateSparkTransactions(
        paymentObjects,
        "incomingPayment",
        0,
        balance,
      );
    } catch (error) {
      console.error("bulkUpdateSparkTransactions failed:", error);
    }
  }, []);

  const handleUpdate = useCallback(
    async (...args) => {
      try {
        const [updateType = "transactions", fee = 0, passedBalance = 0] = args;
        const mnemonic = currentMnemonicRef.current;
        const { identityPubKey, balance: prevBalance } = sparkInfoRef.current;

        console.log(
          "running update in spark context from db changes",
          updateType,
        );

        if (!identityPubKey) {
          console.warn(
            "handleUpdate called but identityPubKey is not available yet",
          );
          return;
        }

        const txs = await getCachedSparkTransactions(null, identityPubKey);

        if (
          updateType === "lrc20Payments" ||
          updateType === "txStatusUpdate" ||
          updateType === "transactions"
        ) {
          setSparkInformation((prev) => ({
            ...prev,
            transactions: txs || prev.transactions,
          }));
        } else if (updateType === "incomingPayment") {
          handleBalanceCache({
            isCheck: false,
            passedBalance: Number(passedBalance),
            mnemonic,
          });
          setSparkInformation((prev) => ({
            ...prev,
            transactions: txs || prev.transactions,
            balance: Number(passedBalance),
          }));
        } else if (updateType === "fullUpdate-waitBalance") {
          if (balancePollingAbortControllerRef.current) {
            balancePollingAbortControllerRef.current.abort();
          }

          balancePollingAbortControllerRef.current = new AbortController();
          currentPollingMnemonicRef.current = mnemonic;

          const pollingMnemonic = currentPollingMnemonicRef.current;

          setSparkInformation((prev) => ({
            ...prev,
            transactions: txs || prev.transactions,
          }));

          const poller = createBalancePoller(
            mnemonic,
            currentMnemonicRef,
            balancePollingAbortControllerRef.current,
            (newBalance) => {
              setSparkInformation((prev) => {
                if (pollingMnemonic !== currentMnemonicRef.current) {
                  return prev;
                }
                handleBalanceCache({
                  isCheck: false,
                  passedBalance: newBalance,
                  mnemonic: pollingMnemonic,
                });
                return {
                  ...prev,
                  balance: newBalance,
                };
              });
            },
            prevBalance,
          );

          balancePollingTimeoutRef.current = poller;
          poller.start();
        } else {
          const balanceResponse = await getSparkBalance(mnemonic);

          const newBalance = balanceResponse.didWork
            ? Number(balanceResponse.balance)
            : prevBalance;

          if (updateType === "paymentWrapperTx") {
            const updatedBalance = Math.round(newBalance - fee);

            handleBalanceCache({
              isCheck: false,
              passedBalance: updatedBalance,
              mnemonic,
            });

            setSparkInformation((prev) => ({
              ...prev,
              transactions: txs || prev.transactions,
              balance: updatedBalance,
              tokens: balanceResponse.didWork
                ? balanceResponse.tokensObj
                : prev.tokens,
            }));
          } else if (updateType === "fullUpdate-tokens") {
            setSparkInformation((prev) => ({
              ...prev,
              transactions: txs || prev.transactions,
              tokens: balanceResponse.didWork
                ? balanceResponse.tokensObj
                : prev.tokens,
            }));
          } else if (updateType === "fullUpdate") {
            handleBalanceCache({
              isCheck: false,
              passedBalance: newBalance,
              mnemonic,
            });

            setSparkInformation((prev) => ({
              ...prev,
              balance: newBalance,
              transactions: txs || prev.transactions,
              tokens: balanceResponse.didWork
                ? balanceResponse.tokensObj
                : prev.tokens,
            }));
          }
        }

        if (
          updateType === "paymentWrapperTx" ||
          updateType === "transactions" ||
          updateType === "txStatusUpdate" ||
          updateType === "lrc20Payments"
        ) {
          console.log(
            "Payment type is send payment, transaction, lrc20 first render, or txstatus update, skipping confirm tx page navigation",
          );
          return;
        }
        const [lastAddedTx] = await getCachedSparkTransactions(
          1,
          identityPubKey,
        );

        console.log(lastAddedTx, "testing");

        if (!lastAddedTx) {
          console.log(
            "No transaction found, skipping confirm tx page navigation",
          );

          return;
        }

        const parsedTx = {
          ...lastAddedTx,
          details: JSON.parse(lastAddedTx.details),
        };

        if (handledNavigatedTxs.current.has(parsedTx.sparkID)) {
          console.log(
            "Already handled transaction, skipping confirm tx page navigation",
          );
          return;
        }
        handledNavigatedTxs.current.add(parsedTx.sparkID);

        const details = parsedTx?.details;

        if (new Date(details.time).getTime() < sessionTimeRef.current) {
          console.log(
            "created before session time was set, skipping confirm tx page navigation",
          );
          return;
        }

        if (isSendingPaymentRef.current) {
          console.log(
            "Is sending payment, skipping confirm tx page navigation",
          );
          return;
        }

        if (details.direction === "OUTGOING") {
          console.log(
            "Only incoming payments navigate here, skipping confirm tx page navigation",
          );
          return;
        }

        const isOnReceivePage = location.pathname === "/receive";

        const isNewestPayment =
          !!details?.createdTime || !!details?.time
            ? new Date(details.createdTime || details?.time).getTime() >
              newestPaymentTimeRef.current
            : false;

        let shouldShowConfirm = false;

        if (
          (lastAddedTx.paymentType?.toLowerCase() === "lightning" &&
            !details.isLNURL &&
            !details?.shouldNavigate &&
            isOnReceivePage &&
            isNewestPayment) ||
          (lastAddedTx.paymentType?.toLowerCase() === "spark" &&
            !details.isLRC20Payment &&
            isOnReceivePage &&
            isNewestPayment)
        ) {
          if (lastAddedTx.paymentType?.toLowerCase() === "spark") {
            const upaidLNInvoices = await getAllUnpaidSparkLightningInvoices();
            const lastMatch = upaidLNInvoices.findLast((invoice) => {
              const savedInvoiceDetails = JSON.parse(invoice.details);
              return (
                !savedInvoiceDetails.sendingUUID &&
                !savedInvoiceDetails.isLNURL &&
                invoice.amount === details.amount
              );
            });

            if (lastMatch && !usedSavedTxIds.current.has(lastMatch.id)) {
              usedSavedTxIds.current.add(lastMatch.id);
              const lastInvoiceDetails = JSON.parse(lastMatch.details);
              if (details.time - lastInvoiceDetails.createdTime < 60 * 1000) {
                shouldShowConfirm = true;
              }
            }
          } else {
            shouldShowConfirm = true;
          }
        }

        // Handle confirm animation here
        setPendingNavigation({
          tx: parsedTx,
          amount: details.amount,
          LRC20Token: details.LRC20Token,
          isLRC20Payment: !!details.LRC20Token,
          showFullAnimation: shouldShowConfirm,
        });
      } catch (err) {
        console.log("error in spark handle db update function", err);
      }
    },
    [location],
  );

  const transferHandler = useCallback((transferId, balance) => {
    if (handledTransfers.current.has(transferId)) return;
    handledTransfers.current.add(transferId);
    console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);

    // Add transferId to pending set
    pendingTransferIds.current.add(transferId);

    // Clear existing timeout if any
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced execution (500ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedHandleIncomingPayment(balance);
    }, 500);
  }, []);

  useEffect(() => {
    if (!sparkInformation.identityPubKey) {
      console.log("Skipping listener setup - no identity pub key yet");
      return;
    }

    console.log("adding web view listeners");

    sparkTransactionsEventEmitter.removeAllListeners(
      SPARK_TX_UPDATE_ENVENT_NAME,
    );

    sparkTransactionsEventEmitter.on(SPARK_TX_UPDATE_ENVENT_NAME, handleUpdate);

    return () => {
      console.log("Cleaning up spark event listeners");
      sparkTransactionsEventEmitter.removeListener(
        SPARK_TX_UPDATE_ENVENT_NAME,
        handleUpdate,
      );
    };
  }, [sparkInformation.identityPubKey, handleUpdate, transferHandler]);

  const addListeners = async (mode) => {
    console.log("Adding Spark listeners...");

    const walletHash = sha256Hash(currentMnemonicRef.current);

    try {
      if (mode === "full") {
        if (!sparkWallet[walletHash]?.listenerCount()) {
          sparkWallet[walletHash].on("transfer:claimed", transferHandler);
        }

        if (!isInitialRestore.current) {
          if (txPollingAbortControllerRef.current) {
            txPollingAbortControllerRef.current.abort();
          }

          txPollingAbortControllerRef.current = new AbortController();
          const restorePoller = createRestorePoller(
            currentMnemonicRef.current,
            isSendingPaymentRef.current,
            currentMnemonicRef,
            txPollingAbortControllerRef.current,
            (result) => {
              console.log("RESTORE COMPLETE");
            },
            sparkInfoRef.current,
          );

          restorePoller.start();
        }

        updateSparkTxStatus(
          currentMnemonicRef.current,
          sparkInfoRef.current.identityPubKey,
        );

        if (updatePendingPaymentsIntervalRef.current) {
          console.log("BLOCKING TRYING TO SET INTERVAL AGAIN");
          clearInterval(updatePendingPaymentsIntervalRef.current);
          updatePendingPaymentsIntervalRef.current = null;
        }

        const capturedMnemonic = currentMnemonicRef.current;
        const capturedWalletHash = walletHash;

        const intervalId = setInterval(async () => {
          try {
            if (capturedMnemonic !== currentMnemonicRef.current) {
              console.log("Mnemonic changed. Aborting interval.");
              clearInterval(intervalId);
              intervalTracker.delete(capturedWalletHash);
              allIntervalIds.delete(intervalId);
              return;
            }

            await updateSparkTxStatus(
              currentMnemonicRef.current,
              sparkInfoRef.current.identityPubKey,
            );

            if (capturedMnemonic !== currentMnemonicRef.current) {
              console.log(
                "Context changed during updateSparkTxStatus. Aborting getLRC20Transactions.",
              );
              clearInterval(intervalId);
              intervalTracker.delete(capturedWalletHash);
              allIntervalIds.delete(intervalId);
              return;
            }

            await getLRC20Transactions({
              ownerPublicKeys: [sparkInfoRef.current.identityPubKey],
              sparkAddress: sparkInfoRef.current.sparkAddress,
              isInitialRun: isInitialLRC20Run.current,
              mnemonic: currentMnemonicRef.current,
            });
            if (isInitialLRC20Run.current) {
              isInitialLRC20Run.current = false;
            }
          } catch (err) {
            console.error("Error during periodic restore:", err);
          }
        }, 10 * 1000);

        if (isInitialRestore.current) {
          isInitialRestore.current = false;
        }

        updatePendingPaymentsIntervalRef.current = intervalId;
        intervalTracker.set(walletHash, intervalId);
        allIntervalIds.add(intervalId);
      }
    } catch (error) {
      console.error("Error in addListeners:", error);
    } finally {
      listenerLock.set(walletHash, false);
      console.log("Lock released for wallet:", walletHash);
    }
  };

  const removeListeners = (onlyClearIntervals = false) => {
    console.log("Removing spark listeners");
    cleanStatusAndLRC20Intervals();
    if (!onlyClearIntervals) {
      if (!prevAccountMnemoincRef.current) {
        prevAccountMnemoincRef.current = currentMnemonicRef.current;
        return;
      }
      const hashedMnemonic = sha256Hash(prevAccountMnemoincRef.current);

      if (
        prevAccountMnemoincRef.current &&
        sparkWallet[hashedMnemonic]?.listenerCount("transfer:claimed")
      ) {
        sparkWallet[hashedMnemonic]?.removeAllListeners("transfer:claimed");
      }

      prevAccountMnemoincRef.current = currentMnemonicRef.current;
    }

    // Clear debounce timeout when removing listeners
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    // Clear pending transfer IDs
    pendingTransferIds.current.clear();

    // Clear update payment state timer
    if (updatePendingPaymentsIntervalRef.current) {
      clearInterval(updatePendingPaymentsIntervalRef.current);
      updatePendingPaymentsIntervalRef.current = null;
    }
    //Clear balance polling
    if (balancePollingTimeoutRef.current) {
      clearTimeout(balancePollingTimeoutRef.current);
      balancePollingTimeoutRef.current = null;
    }
    if (balancePollingAbortControllerRef.current) {
      balancePollingAbortControllerRef.current.abort();
      balancePollingAbortControllerRef.current = null;
    }
    if (txPollingTimeoutRef.current) {
      clearTimeout(txPollingTimeoutRef.current);
      txPollingTimeoutRef.current = null;
    }
    if (txPollingAbortControllerRef.current) {
      txPollingAbortControllerRef.current.abort();
      txPollingAbortControllerRef.current = null;
    }
    currentPollingMnemonicRef.current = null;
  };

  // Add event listeners to listen for bitcoin and lightning or spark transfers when receiving does not handle sending
  useEffect(() => {
    if (prevAppState.current !== appState && appState === "background") {
      console.log("App moved to background — clearing listener type");
      prevListenerType.current = null;
    }

    const timeoutId = setTimeout(async () => {
      if (!didGetToHomepage) return;
      if (!sparkInfoRef.current.identityPubKey) return;

      const getListenerType = () => {
        if (appState === "active") return "full";
        return null;
      };

      const newType = getListenerType();
      const prevType = prevListenerType.current;
      const prevId = prevAccountId.current;

      // Only reconfigure listeners when becoming active
      if (
        (newType !== prevType ||
          prevId !== sparkInfoRef.current.identityPubKey) &&
        appState === "active"
      ) {
        removeListeners();
        if (newType) await addListeners(newType);
        prevListenerType.current = newType;
        prevAccountId.current = sparkInfoRef.current.identityPubKey;
      }

      prevAppState.current = appState;
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    appState,
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    didGetToHomepage,
  ]);

  useEffect(() => {
    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    if (!sparkInformation.identityPubKey) return;

    // Interval to check deposit addresses to see if they were paid
    const handleDepositAddressCheck = async () => {
      try {
        console.log("l1Deposit check running....");
        if (isSendingPaymentRef.current) return;
        if (!currentMnemonicRef.current) return;
        const allTxs = await getAllSparkTransactions({
          accountId: sparkInformation.identityPubKey,
        });
        const savedTxMap = new Map(allTxs.map((tx) => [tx.sparkID, tx]));

        const depositAddresses = await queryAllStaticDepositAddresses(
          currentMnemonicRef.current,
        );

        // Loop through deposit addresses and check if they have been paid
        for (const address of depositAddresses) {
          console.log("Checking deposit address:", address);
          if (!address) continue;

          // Use Spark SDK to get unclaimed UTXOs (excludeClaimed: true)
          const unclaimedUtxos = await getUtxosForDepositAddress({
            depositAddress: address,
            mnemonic: currentMnemonicRef.current,
          });

          console.log("Unclaimed UTXOs for address:", address, unclaimedUtxos);

          if (!unclaimedUtxos.didWork || !unclaimedUtxos.utxos.length) continue;

          let claimedTxs = Storage.getItem("claimedBitcoinTxs") || [];

          for (const utxo of unclaimedUtxos.utxos) {
            const { txid, vout } = utxo;
            const hasAlreadySaved = savedTxMap.has(txid);

            // Get quote for this specific UTXO
            const {
              didwork: quoteDidWorkResponse,
              quote,
              error,
            } = await getSparkStaticBitcoinL1AddressQuote(
              txid,
              currentMnemonicRef.current,
            );

            if (!quoteDidWorkResponse || !quote) {
              console.log(error, "Error getting deposit address quote");

              // If UTXO is already claimed by current user, just skip
              if (
                error.includes("UTXO is already claimed by the current user.")
              ) {
                continue;
              }

              // If we don't have it saved yet, add as pending
              if (!hasAlreadySaved) {
                await addPendingTransaction(
                  {
                    transactionId: txid,
                    creditAmountSats: quote?.creditAmountSats || 0,
                  },
                  address,
                  sparkInfoRef.current,
                );
              }
              continue;
            }

            // Check if we've already processed this specific quote
            if (claimedTxs?.includes(quote.signature)) {
              continue;
            }

            // Attempt to claim the UTXO
            const {
              didWork,
              error: claimError,
              response: claimTx,
            } = await claimnSparkStaticDepositAddress({
              transactionId: quote.transactionId,
              creditAmountSats: quote.creditAmountSats,
              sspSignature: quote.signature,
              outputIndex: vout, // Use the vout from the UTXO
              mnemonic: currentMnemonicRef.current,
            });

            // Add pending transaction if not already saved
            if (!hasAlreadySaved) {
              await addPendingTransaction(quote, address, sparkInfoRef.current);
            }

            if (!claimTx || !didWork) {
              console.log("Claim static deposit address error", claimError);
              continue;
            }

            console.log("Claimed deposit address transaction:", claimTx);

            // Mark as claimed
            if (!claimedTxs?.includes(quote.signature)) {
              claimedTxs.push(quote.signature);
              Storage.setItem("claimedBitcoinTxs", claimedTxs);
            }

            // Wait for the transfer to settle
            await new Promise((res) => setTimeout(res, 2000));

            const bitcoinTransfer = await getSingleTxDetails(
              currentMnemonicRef.current,
              claimTx.transferId,
            );

            let updatedTx = {};
            if (!bitcoinTransfer) {
              updatedTx = {
                useTempId: true,
                id: claimTx.transferId,
                tempId: quote.transactionId,
                paymentStatus: "pending",
                paymentType: "bitcoin",
                accountId: sparkInfoRef.current.identityPubKey,
              };
            } else {
              updatedTx = {
                useTempId: true,
                tempId: quote.transactionId,
                id: bitcoinTransfer.id,
                paymentStatus: "completed",
                paymentType: "bitcoin",
                accountId: sparkInfoRef.current.identityPubKey,
                details: {
                  amount: bitcoinTransfer.totalValue,
                  fee: Math.abs(
                    quote.creditAmountSats - bitcoinTransfer.totalValue,
                  ),
                  totalFee: Math.abs(
                    quote.creditAmountSats - bitcoinTransfer.totalValue,
                  ),
                  supportFee: 0,
                },
              };
            }

            console.log("Updated bitcoin transaction:", updatedTx);
            await bulkUpdateSparkTransactions([updatedTx]);

            // Navigate to confirm screen if we have details
            if (updatedTx.details) {
              if (handledNavigatedTxs.current.has(updatedTx.id)) return;
              handledNavigatedTxs.current.add(updatedTx.id);
              setPendingNavigation({
                tx: updatedTx,
                amount: updatedTx.details.amount,
                showFullAnimation: false,
              });
            }
          }
        }
      } catch (err) {
        console.log("Handle deposit address check error", err);
      }
    };

    const addPendingTransaction = async (quote, address, sparkInformation) => {
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
          description: i18next.t("contexts.spark.depositLabel"),
          onChainTxid: quote.transactionId,
          isRestore: true, // This is a restore payment
        },
      };
      await addSingleSparkTransaction(pendingTx);
    };

    clearAllDepositIntervals();
    if (depositAddressIntervalRef.current) {
      clearInterval(depositAddressIntervalRef.current);
      depositAddressIntervalRef.current = null;
    }

    if (!initialBitcoinIntervalRun.current) {
      setTimeout(handleDepositAddressCheck, 1_000 * 5);
      initialBitcoinIntervalRun.current = true;
    }

    const depositIntervalId = setInterval(
      handleDepositAddressCheck,
      1_000 * 60,
    );

    depositAddressIntervalRef.current = depositIntervalId;
    depositIntervalIds.add(depositIntervalId);

    return () => {
      console.log("Cleaning up deposit interval on unmount/dependency change");
      if (depositIntervalId) {
        clearInterval(depositIntervalId);
        depositIntervalIds.delete(depositIntervalId);
      }
      if (depositAddressIntervalRef.current) {
        clearInterval(depositAddressIntervalRef.current);
        depositAddressIntervalRef.current = null;
      }
    };
  }, [
    didGetToHomepage,
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
  ]);

  // Run fullRestore when didConnect becomes true
  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    if (!sparkInformation.identityPubKey) return;
    if (didRunInitialRestore.current) return;
    didRunInitialRestore.current = true;

    async function runRestore() {
      const restoreResponse = await fullRestoreSparkState({
        sparkAddress: sparkInfoRef.current.sparkAddress,
        batchSize: isInitialRestore.current ? 5 : 2,
        isSendingPayment: isSendingPaymentRef.current,
        mnemonic: currentMnemonicRef.current,
        identityPubKey: sparkInfoRef.current.identityPubKey,
        isInitialRestore: isInitialRestore.current,
      });

      if (!restoreResponse) {
        setRestoreCompleted(true); // This will get the transactions for the session
      }
    }

    runRestore();
  }, [sparkInformation.didConnect, sparkInformation.identityPubKey]);

  // Run transactions after BOTH restore completes
  useEffect(() => {
    if (!restoreCompleted) return;

    async function fetchTransactions() {
      const transactions = await getCachedSparkTransactions(
        null,
        sparkInfoRef.current.identityPubKey,
      );
      setSparkInformation((prev) => ({ ...prev, transactions }));
      hasRestoreCompleted.current = true;
    }

    fetchTransactions();
  }, [restoreCompleted]);

  // This function connects to the spark node and sets the session up

  const connectToSparkWallet = useCallback(async () => {
    console.log(accountMnemoinc, "acc me");
    const { didWork, error } = await initWallet({
      setSparkInformation,
      // toggleGlobalContactsInformation,
      // globalContactsInformation,
      mnemonic: accountMnemoinc,
      hasRestoreCompleted: hasRestoreCompleted.current,
    });

    console.log(didWork, "did Connect to spark");
    if (!didWork) {
      setSparkInformation((prev) => ({ ...prev, didConnect: false }));
      setSparkConnectionError(error);
      console.log("Error connecting to spark wallet:", error);
      return;
    }
  }, [accountMnemoinc]);

  // Function to update db when all reqiured information is loaded
  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    if (!globalContactsInformation?.myProfile) return;
    if (!sparkInformation.identityPubKey) return;
    if (!sparkInformation.sparkAddress) return;

    if (sparkDBaddress.current) return;
    sparkDBaddress.current = true;

    if (
      !globalContactsInformation.myProfile.sparkAddress ||
      !globalContactsInformation.myProfile.sparkIdentityPubKey
    ) {
      toggleGlobalContactsInformation(
        {
          myProfile: {
            ...globalContactsInformation.myProfile,
            sparkAddress: sparkInformation.sparkAddress,
            sparkIdentityPubKey: sparkInformation.identityPubKey,
          },
        },
        true,
      );
    }
  }, [
    globalContactsInformation.myProfile,
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    sparkInformation.sparkAddress,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      pendingTransferIds.current.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      sparkInformation,
      setSparkInformation,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,

      connectToSparkWallet,
      isSendingPaymentRef,
    }),
    [
      sparkInformation,
      setSparkInformation,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,

      connectToSparkWallet,
      isSendingPaymentRef,
    ],
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
