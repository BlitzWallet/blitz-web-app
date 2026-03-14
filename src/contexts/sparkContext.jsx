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
  getSparkStaticBitcoinL1AddressQuote,
  getUtxosForDepositAddress,
  queryAllStaticDepositAddresses,
  sparkWallet,
} from "../functions/spark";
import {
  addSingleSparkTransaction,
  bulkUpdateSparkTransactions,
  getAllSparkContactInvoices,
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
import {
  createBalancePoller,
  createRestorePoller,
} from "../functions/pollingManager";
import i18next from "i18next";
import { useLocation } from "react-router-dom";
import { BALANCE_SNAPSHOT_KEY } from "../constants";

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

// ─── Update type classification sets (mirrors React Native) ───────────────────
const TX_REFRESH_UPDATE_TYPES = new Set([
  "transactions",
  "txStatusUpdate",
  "lrc20Payments",
  "contactDetailsUpdate",
  "incrementalRestore",
  "incomingPayment",
  "fullUpdate",
  "fullUpdate-waitBalance",
  "fullUpdate-tokens",
  "paymentWrapperTx",
]);

const BALANCE_INTENT_UPDATE_TYPES = new Set([
  "fullUpdate-waitBalance",
  "paymentWrapperTx",
  "fullUpdate",
  "fullUpdate-tokens",
]);

const SKIP_CONFIRM_NAV_UPDATE_TYPES = new Set([
  "paymentWrapperTx",
  "transactions",
  "txStatusUpdate",
  "lrc20Payments",
  "contactDetailsUpdate",
  "incrementalRestore",
]);

// Initiate context
const SparkWalletManager = createContext(null);

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
    tokens: {},
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
    transactions: [],
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
  const initialBitcoinIntervalRun = useRef(null);
  const prevAppState = useRef(appState);
  const prevListenerType = useRef(null);

  // ─── Queued update lanes ──────────────────────────────────────────────────
  const txLaneQueueRef = useRef(Promise.resolve());
  const uiLaneQueueRef = useRef(Promise.resolve());
  const queueDepthRef = useRef(0);
  const eventSequenceRef = useRef(0);

  // ─── Balance epoch / supervisor refs ─────────────────────────────────────
  const balanceEpochRef = useRef({ target: 0, applied: 0 });
  const balanceSupervisorRunIdRef = useRef(0);
  const balanceVersionRef = useRef(0);
  const hasRunInitBalancePoll = useRef(false);
  const isBalancePollerRunningRef = useRef(false);
  const lastBalancePollEventRef = useRef({ updateType: null, timestamp: 0 });

  // ─── Forced-pending / boundary refs ──────────────────────────────────────
  const forcedPendingBySparkIdRef = useRef(new Map());
  const lastConfirmedTxBoundaryRef = useRef(null);
  const preSendBoundaryRef = useRef(null);

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

  const showTokensInformation =
    masterInfoObject.enabledBTKNTokens === null
      ? !!Object.keys(sparkInformation.tokens || {}).length
      : masterInfoObject.enabledBTKNTokens;

  // ─── Debounce refs for incoming transfer handler ──────────────────────────
  const debounceTimeoutRef = useRef(null);
  const pendingTransferIds = useRef(new Set());

  // ─── Interval helpers ─────────────────────────────────────────────────────

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

  // ─── Keep sparkInfoRef in sync ────────────────────────────────────────────

  useEffect(() => {
    sparkInfoRef.current = {
      balance: sparkInformation.balance,
      tokens: sparkInformation.tokens,
      identityPubKey: sparkInformation.identityPubKey,
      sparkAddress: sparkInformation.sparkAddress,
      transactions: sparkInformation.transactions?.slice(0, 50),
    };
  }, [
    sparkInformation.balance,
    sparkInformation.tokens,
    sparkInformation.identityPubKey,
    sparkInformation.sparkAddress,
    sparkInformation.transactions,
  ]);

  useEffect(() => {
    currentMnemonicRef.current = currentWalletMnemoinc;
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    // Fix race condition with preloaded txs: push session boundary 5 s forward
    sessionTimeRef.current = Date.now() + 5 * 1000;
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    newestPaymentTimeRef.current = Date.now();
  }, [reloadNewestPaymentTimestamp]);

  // ─── Token image cache ────────────────────────────────────────────────────

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

  // ─── Forced-pending helpers ───────────────────────────────────────────────

  const getTxAddedAt = (tx) => {
    try {
      return Number(JSON.parse(tx.details)?.dateAddedToDb) || 0;
    } catch {
      return 0;
    }
  };

  const getBoundaryFromTxs = (transactions) =>
    (transactions || []).slice(0, 10).reduce((max, tx) => {
      return Math.max(max, getTxAddedAt(tx));
    }, 0);

  const ensureConfirmedBoundary = (transactions) => {
    if (lastConfirmedTxBoundaryRef.current != null) return;
    const boundary = getBoundaryFromTxs(transactions);
    lastConfirmedTxBoundaryRef.current = boundary || 0;
  };

  const registerForcedPendingForEpoch = (transactions, epoch) => {
    if (!epoch || !transactions?.length) return;
    ensureConfirmedBoundary(sparkInfoRef.current.transactions || transactions);

    const boundary =
      preSendBoundaryRef.current ?? lastConfirmedTxBoundaryRef.current ?? 0;

    let confirmedStreak = 0;
    for (let index = 0; index < transactions.length; index++) {
      const tx = transactions[index];
      const addedAt = getTxAddedAt(tx);

      if (addedAt > boundary) {
        const existing = forcedPendingBySparkIdRef.current.get(tx.sparkID);
        if (!existing) {
          forcedPendingBySparkIdRef.current.set(tx.sparkID, { epoch, addedAt });
        }
        confirmedStreak = 0;
      } else {
        confirmedStreak += 1;
        if (confirmedStreak > 25) break;
      }
    }
  };

  const releaseForcedPendingUpToEpoch = (epoch) => {
    let maxReleasedBoundary = lastConfirmedTxBoundaryRef.current ?? 0;
    for (const [sparkId, meta] of forcedPendingBySparkIdRef.current.entries()) {
      if ((meta?.epoch || 0) <= epoch) {
        maxReleasedBoundary = Math.max(maxReleasedBoundary, meta?.addedAt || 0);
        forcedPendingBySparkIdRef.current.delete(sparkId);
      }
    }

    for (const [sparkId, meta] of forcedPendingBySparkIdRef.current.entries()) {
      if ((meta?.addedAt || 0) <= maxReleasedBoundary) {
        forcedPendingBySparkIdRef.current.delete(sparkId);
      }
    }

    lastConfirmedTxBoundaryRef.current = maxReleasedBoundary;
  };

  const releaseForcedPendingUpToBoundary = (boundary) => {
    if (!Number.isFinite(boundary)) return;
    const normalizedBoundary = Number(boundary) || 0;

    for (const [sparkId, meta] of forcedPendingBySparkIdRef.current.entries()) {
      if ((meta?.addedAt || 0) <= normalizedBoundary) {
        forcedPendingBySparkIdRef.current.delete(sparkId);
      }
    }

    lastConfirmedTxBoundaryRef.current = Math.max(
      lastConfirmedTxBoundaryRef.current || 0,
      normalizedBoundary,
    );
  };

  const applyForcedPendingFlags = (transactions) => {
    if (!transactions?.length) return transactions;
    if (!forcedPendingBySparkIdRef.current.size) return transactions;

    const appliedEpoch = balanceEpochRef.current.applied;
    return transactions.map((tx) => {
      const pendingMeta = forcedPendingBySparkIdRef.current.get(tx.sparkID);
      if (!pendingMeta || pendingMeta.epoch <= appliedEpoch) return tx;
      if (tx.isBalancePending) return tx;
      return { ...tx, isBalancePending: true };
    });
  };

  // ─── Update lanes ─────────────────────────────────────────────────────────

  const enqueueTxLane = useCallback((updateType, task) => {
    queueDepthRef.current += 1;
    console.log(
      `[TxLane] +1 (${updateType}) -> depth: ${queueDepthRef.current}`,
    );

    txLaneQueueRef.current = txLaneQueueRef.current
      .then(task)
      .catch((err) => console.log("[TxLane] task error", updateType, err))
      .finally(() => {
        queueDepthRef.current -= 1;
        console.log(
          `[TxLane] -1 (${updateType}) -> depth: ${queueDepthRef.current}`,
        );
      });

    return txLaneQueueRef.current;
  }, []);

  const enqueueUiLane = useCallback((updateType, task) => {
    uiLaneQueueRef.current = uiLaneQueueRef.current
      .then(task)
      .catch((err) => console.log("[UiLane] task error", updateType, err));

    return uiLaneQueueRef.current;
  }, []);

  // ─── Confirm navigation (standalone, called from both handleUpdate and balance supervisor) ──

  const maybeHandleConfirmNavigation = useCallback(
    async (updateType, txs = null) => {
      try {
        if (SKIP_CONFIRM_NAV_UPDATE_TYPES.has(updateType)) return;

        const { identityPubKey } = sparkInfoRef.current;
        if (!identityPubKey) return;

        let lastAddedTx;
        if (txs) {
          lastAddedTx = txs[0];
        } else {
          const [result] = await getCachedSparkTransactions(1, identityPubKey);
          lastAddedTx = result;
        }

        if (!lastAddedTx) return;

        let parsedDetails = {};
        try {
          parsedDetails =
            typeof lastAddedTx.details === "string"
              ? JSON.parse(lastAddedTx.details || "{}")
              : lastAddedTx.details || {};
        } catch {
          parsedDetails = {};
        }

        const parsedTx = { ...lastAddedTx, details: parsedDetails };
        const details = parsedTx.details || {};

        if (parsedTx.isBalancePending) {
          console.log(
            "Payment balance is still being confirmed, will be handled once balance poller is done",
          );
          return;
        }

        if (parsedTx.paymentStatus === "pending") {
          const { updated } = await updateSparkTxStatus(
            currentMnemonicRef.current,
            sparkInfoRef.current.identityPubKey,
            true,
          );
          const didUpdateStatus = updated?.find(
            (tx) =>
              tx.tempId === parsedTx.sparkID &&
              tx.paymentStatus === "completed",
          );
          if (!didUpdateStatus) {
            console.log("Payment is pending, show navigation once confirmed");
            return;
          }
        }

        const txTime = new Date(details.time).getTime();
        if (Number.isFinite(txTime) && txTime < sessionTimeRef.current) {
          console.log(
            "Created before session time was set, skipping confirm tx page navigation",
          );
          return;
        }

        if (parsedTx?.paymentStatus?.toLowerCase() === "failed") {
          console.log("This payment is of type failed, do not navigate here");
          return;
        }

        if (details.performSwaptoUSD) {
          console.log(
            "This payment is being used to perform a swap, do not navigate here.",
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

        if (handledNavigatedTxs.current.has(parsedTx.sparkID)) {
          console.log(
            "Already handled transaction, skipping confirm tx page navigation",
          );
          return;
        }
        handledNavigatedTxs.current.add(parsedTx.sparkID);

        const isOnReceivePage = location.pathname === "/receive";

        const hasPaymentTime = !!details.createdTime || !!details.time;
        const isNewestPayment = hasPaymentTime
          ? new Date(details.createdTime || details.time).getTime() >
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
            const unpaidLNInvoices = await getAllUnpaidSparkLightningInvoices();
            const lastMatch = unpaidLNInvoices.findLast((invoice) => {
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

        setPendingNavigation({
          tx: parsedTx,
          amount: details.amount,
          LRC20Token: details.LRC20Token,
          isLRC20Payment: !!details.LRC20Token,
          showFullAnimation: shouldShowConfirm,
        });
      } catch (err) {
        console.log("[UiLane] confirm navigation error", err);
      }
    },
    [location],
  );

  // ─── Project transactions for a single event ─────────────────────────────

  const projectTransactionsForEvent = useCallback(
    async (event) => {
      const { identityPubKey } = sparkInfoRef.current;
      if (!identityPubKey) {
        console.warn(
          "Skipping tx projection because identityPubKey is not ready yet",
        );
        return;
      }

      const txs = await getCachedSparkTransactions(null, identityPubKey);

      if (event.balanceEpoch) {
        registerForcedPendingForEpoch(txs, event.balanceEpoch);
      } else {
        ensureConfirmedBoundary(txs);
      }

      const txListWithPendingFlags = applyForcedPendingFlags(txs);

      setSparkInformation((prev) => ({
        ...prev,
        transactions: txListWithPendingFlags,
      }));

      enqueueUiLane(event.updateType, () =>
        maybeHandleConfirmNavigation(event.updateType, txListWithPendingFlags),
      );
    },
    [enqueueUiLane, maybeHandleConfirmNavigation],
  );

  // ─── Balance supervisor ───────────────────────────────────────────────────

  const applyConfirmedBalanceSnapshot = useCallback(
    async (epoch, result) => {
      const { identityPubKey } = sparkInfoRef.current;

      balanceEpochRef.current.applied = Math.max(
        balanceEpochRef.current.applied,
        epoch,
      );

      const numericBalance = Number(result?.balance);

      // Persist balance snapshot to local storage
      try {
        Storage.setItem(
          BALANCE_SNAPSHOT_KEY,
          JSON.stringify({
            balance: Number.isFinite(numericBalance)
              ? numericBalance
              : sparkInfoRef.current.balance,
            tokens: result?.didWork
              ? result.tokensObj
              : sparkInfoRef.current.tokens,
          }),
        );
      } catch (err) {
        console.log("Error saving spark balance to local storage", err);
      }

      const freshTxs = identityPubKey
        ? await getCachedSparkTransactions(null, identityPubKey)
        : sparkInfoRef.current.transactions || [];

      releaseForcedPendingUpToEpoch(epoch);
      releaseForcedPendingUpToBoundary(getBoundaryFromTxs(freshTxs));
      ensureConfirmedBoundary(freshTxs);
      const projectedTxs = applyForcedPendingFlags(freshTxs);

      await maybeHandleConfirmNavigation("afterBalancePoller", projectedTxs);

      const myVersion = ++balanceVersionRef.current;
      setSparkInformation((prev) => {
        if (myVersion < balanceVersionRef.current) return prev;
        return {
          ...prev,
          balance: Number.isFinite(numericBalance)
            ? numericBalance
            : prev.balance,
          tokens: result?.didWork ? result.tokensObj : prev.tokens,
          transactions: projectedTxs || prev.transactions,
        };
      });
    },
    [maybeHandleConfirmNavigation],
  );

  const runBalanceSupervisor = useCallback(async () => {
    if (isBalancePollerRunningRef.current) return;
    const mnemonic = currentMnemonicRef.current;
    if (!mnemonic) return;

    isBalancePollerRunningRef.current = true;
    const runId = ++balanceSupervisorRunIdRef.current;
    currentPollingMnemonicRef.current = mnemonic;

    try {
      while (
        balanceEpochRef.current.applied < balanceEpochRef.current.target &&
        mnemonic === currentMnemonicRef.current
      ) {
        const epochToResolve = balanceEpochRef.current.target;
        const abortController = new AbortController();
        balancePollingAbortControllerRef.current = abortController;

        console.log(
          `[BalanceLane] starting poll for epoch ${epochToResolve} (${
            lastBalancePollEventRef.current.updateType || "unknown"
          })`,
        );

        const poller = createBalancePoller(
          mnemonic,
          currentMnemonicRef,
          abortController,
          async (balanceResult) => {
            if (abortController.signal.aborted) return;
            if (runId !== balanceSupervisorRunIdRef.current) return;
            await applyConfirmedBalanceSnapshot(epochToResolve, balanceResult);
          },
          sparkInfoRef.current.balance,
        );

        balancePollingTimeoutRef.current = poller;
        const response = await poller.start();

        if (runId !== balanceSupervisorRunIdRef.current) return;
        if (abortController.signal.aborted) return;
        if (mnemonic !== currentMnemonicRef.current) return;
        if (response.reason === "aborted") return;

        if (response.reason === "max_retries") {
          const fallbackResult =
            response.result?.didWork === true
              ? response.result
              : await getSparkBalance(mnemonic);
          await applyConfirmedBalanceSnapshot(epochToResolve, fallbackResult);
        }

        balanceEpochRef.current.applied = Math.max(
          balanceEpochRef.current.applied,
          epochToResolve,
        );
        releaseForcedPendingUpToEpoch(balanceEpochRef.current.applied);
      }
    } catch (err) {
      console.log("[BalanceLane] poller error", err);
    } finally {
      isBalancePollerRunningRef.current = false;
      balancePollingAbortControllerRef.current = null;

      if (
        balanceEpochRef.current.applied < balanceEpochRef.current.target &&
        mnemonic === currentMnemonicRef.current
      ) {
        setTimeout(() => {
          runBalanceSupervisor();
        }, 60);
      }
    }
  }, [applyConfirmedBalanceSnapshot]);

  const requestBalanceReconcile = useCallback(
    (updateType, options = {}) => {
      const { shouldForcePending = true } = options;
      const epoch = balanceEpochRef.current.target + 1;
      balanceEpochRef.current.target = epoch;
      lastBalancePollEventRef.current = {
        updateType,
        timestamp: Date.now(),
      };

      if (shouldForcePending) {
        const currentTxs = sparkInfoRef.current.transactions || [];
        registerForcedPendingForEpoch(currentTxs, epoch);
        setSparkInformation((prev) => ({
          ...prev,
          transactions: applyForcedPendingFlags(prev.transactions || []),
        }));
      }

      runBalanceSupervisor();
      return epoch;
    },
    [runBalanceSupervisor],
  );

  // ─── Incoming payment snapshot (aborts supervisor, applies immediately) ───

  const applyIncomingPaymentSnapshot = useCallback(async (passedBalance) => {
    const mnemonic = currentMnemonicRef.current;
    const { identityPubKey } = sparkInfoRef.current;

    if (balancePollingAbortControllerRef.current) {
      balancePollingAbortControllerRef.current.abort();
      balancePollingAbortControllerRef.current = null;
    }
    balanceSupervisorRunIdRef.current += 1;
    isBalancePollerRunningRef.current = false;

    const settledEpoch = balanceEpochRef.current.target + 1;
    balanceEpochRef.current.target = settledEpoch;
    balanceEpochRef.current.applied = settledEpoch;
    forcedPendingBySparkIdRef.current.clear();

    const [balanceResponse, freshTxs] = await Promise.all([
      getSparkBalance(mnemonic),
      identityPubKey
        ? getCachedSparkTransactions(null, identityPubKey)
        : Promise.resolve([]),
    ]);

    const numericPassedBalance = Number(passedBalance);

    try {
      Storage.setItem(
        BALANCE_SNAPSHOT_KEY,
        JSON.stringify({
          balance: Number.isFinite(numericPassedBalance)
            ? numericPassedBalance
            : sparkInfoRef.current.balance,
          tokens: balanceResponse.didWork
            ? balanceResponse.tokensObj
            : sparkInfoRef.current.tokens,
        }),
      );
    } catch (err) {
      console.log("Error saving spark balance to local storage", err);
    }

    ensureConfirmedBoundary(freshTxs);
    lastConfirmedTxBoundaryRef.current = Math.max(
      lastConfirmedTxBoundaryRef.current || 0,
      getBoundaryFromTxs(freshTxs),
    );

    const myVersion = ++balanceVersionRef.current;
    setSparkInformation((prev) => {
      if (myVersion < balanceVersionRef.current) return prev;
      return {
        ...prev,
        transactions: applyForcedPendingFlags(freshTxs || prev.transactions),
        balance: Number.isFinite(numericPassedBalance)
          ? numericPassedBalance
          : prev.balance,
        tokens: balanceResponse.didWork
          ? balanceResponse.tokensObj
          : prev.tokens,
      };
    });
  }, []);

  // ─── Main event handler (dispatches into lanes declaratively) ────────────

  const handleUpdate = useCallback(
    (...args) => {
      const [updateType = "transactions", fee = 0, passedBalance = 0] = args;

      const event = {
        seq: ++eventSequenceRef.current,
        updateType,
        fee,
        passedBalance,
        balanceEpoch: null,
      };

      console.log(
        "running update in spark context from db changes",
        updateType,
      );

      if (BALANCE_INTENT_UPDATE_TYPES.has(updateType)) {
        event.balanceEpoch = requestBalanceReconcile(updateType, {
          shouldForcePending: true,
        });
      }

      if (updateType === "incomingPayment") {
        applyIncomingPaymentSnapshot(passedBalance).catch((err) =>
          console.log("[BalanceLane] incoming payment snapshot error", err),
        );
      }

      if (!TX_REFRESH_UPDATE_TYPES.has(updateType)) {
        return Promise.resolve();
      }

      return enqueueTxLane(updateType, () =>
        projectTransactionsForEvent(event),
      );
    },
    [
      enqueueTxLane,
      projectTransactionsForEvent,
      requestBalanceReconcile,
      applyIncomingPaymentSnapshot,
    ],
  );

  // ─── Incoming transfer handler (debounced) ────────────────────────────────

  const toggleIsSendingPayment = useCallback((isSending) => {
    console.log("Setting is sending payment", isSending);
    if (isSending) {
      if (txPollingAbortControllerRef.current) {
        txPollingAbortControllerRef.current.abort();
        txPollingAbortControllerRef.current = null;
      }
      // Snapshot boundary before the send tx is written to DB
      preSendBoundaryRef.current = getBoundaryFromTxs(
        sparkInfoRef.current.transactions || [],
      );
    } else {
      preSendBoundaryRef.current = null;
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
      console.log("clearning up toggle send payment");
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

    // Step 1: Write placeholders immediately so restore handler sees them
    const placeholders = transferIdsToProcess.map((transferId) => ({
      id: transferId,
      paymentStatus: "pending",
      paymentType: "unknown",
      accountId: sparkInfoRef.current.identityPubKey,
      details: {
        createdTime: Date.now(),
        isPlaceholder: true,
        direction: "INCOMING",
      },
    }));

    try {
      await bulkUpdateSparkTransactions(placeholders, "transactions");
    } catch (error) {
      console.error("Error writing placeholder transactions:", error);
    }

    // Step 2: Fetch full tx details
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
      setSparkInformation((prev) => ({
        ...prev,
        balance: balance,
      }));
      return;
    }

    try {
      await bulkUpdateSparkTransactions(
        paymentObjects,
        isSendingPaymentRef.current ? "transactions" : "incomingPayment",
        0,
        balance,
      );
    } catch (error) {
      console.error("bulkUpdateSparkTransactions failed:", error);
    }
  }, []);

  const transferHandler = useCallback((transferId, balance) => {
    if (handledTransfers.current.has(transferId)) return;
    handledTransfers.current.add(transferId);
    console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);

    pendingTransferIds.current.add(transferId);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      debouncedHandleIncomingPayment(balance);
    }, 500);
  }, []);

  // ─── Attach/detach DB event listeners ────────────────────────────────────

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

  // ─── addListeners / removeListeners ──────────────────────────────────────

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

            const response = await updateSparkTxStatus(
              currentMnemonicRef.current,
              sparkInfoRef.current.identityPubKey,
            );

            if (response?.shouldCheck) {
              const txs = sparkInfoRef.current.transactions;
              const isStateUnaligned = txs?.find(
                (tx) => tx.paymentStatus === "pending",
              );
              if (isStateUnaligned) {
                sparkTransactionsEventEmitter.emit(
                  SPARK_TX_UPDATE_ENVENT_NAME,
                  "transactions",
                );
              }
            }

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

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    pendingTransferIds.current.clear();

    if (updatePendingPaymentsIntervalRef.current) {
      clearInterval(updatePendingPaymentsIntervalRef.current);
      updatePendingPaymentsIntervalRef.current = null;
    }

    // Abort balance supervisor
    if (balancePollingAbortControllerRef.current) {
      balancePollingAbortControllerRef.current.abort();
      balancePollingAbortControllerRef.current = null;
    }
    balanceSupervisorRunIdRef.current += 1;
    isBalancePollerRunningRef.current = false;
    balancePollingTimeoutRef.current = null;

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

  // ─── App state / listener lifecycle ──────────────────────────────────────

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

  // ─── Deposit address polling ──────────────────────────────────────────────

  useEffect(() => {
    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    if (!sparkInformation.identityPubKey) return;

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

        for (const address of depositAddresses) {
          console.log("Checking deposit address:", address);
          if (!address) continue;

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

              if (
                error?.includes("UTXO is already claimed by the current user.")
              ) {
                continue;
              }

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

            if (claimedTxs?.includes(quote.signature)) {
              continue;
            }

            const {
              didWork,
              error: claimError,
              response: claimTx,
            } = await claimnSparkStaticDepositAddress({
              transactionId: quote.transactionId,
              creditAmountSats: quote.creditAmountSats,
              sspSignature: quote.signature,
              outputIndex: vout,
              mnemonic: currentMnemonicRef.current,
            });

            if (!hasAlreadySaved) {
              await addPendingTransaction(quote, address, sparkInfoRef.current);
            }

            if (!claimTx || !didWork) {
              console.log("Claim static deposit address error", claimError);
              continue;
            }

            console.log("Claimed deposit address transaction:", claimTx);

            if (!claimedTxs?.includes(quote.signature)) {
              claimedTxs.push(quote.signature);
              Storage.setItem("claimedBitcoinTxs", claimedTxs);
            }

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

    const addPendingTransaction = async (quote, address, sparkState) => {
      const pendingTx = {
        id: quote.transactionId,
        paymentStatus: "pending",
        paymentType: "bitcoin",
        accountId: sparkState.identityPubKey,
        details: {
          fee: 0,
          amount: quote.creditAmountSats,
          address: address,
          time: new Date().getTime(),
          direction: "INCOMING",
          description: i18next.t("contexts.spark.depositLabel"),
          onChainTxid: quote.transactionId,
          isRestore: true,
        },
      };
      await bulkUpdateSparkTransactions([pendingTx], "transactions");
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

  // ─── Initial restore on connect ───────────────────────────────────────────

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
        setRestoreCompleted(true);
      }
    }

    runRestore();
  }, [sparkInformation.didConnect, sparkInformation.identityPubKey]);

  // ─── Load txs after restore completes ────────────────────────────────────

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

  // ─── Initial balance reconciliation once per wallet session ──────────────

  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    if (!sparkInformation.identityPubKey) return;
    if (hasRunInitBalancePoll.current) return;

    hasRunInitBalancePoll.current = true;
    requestBalanceReconcile("initialConnect", { shouldForcePending: false });
  }, [
    sparkInformation.didConnect,
    sparkInformation.identityPubKey,
    requestBalanceReconcile,
  ]);

  // ─── Connect to spark wallet ──────────────────────────────────────────────

  const connectToSparkWallet = useCallback(
    async (identityPubKey) => {
      console.log(accountMnemoinc, "acc me");
      const { didWork, error } = await initWallet({
        setSparkInformation,
        mnemonic: accountMnemoinc,
        hasRestoreCompleted: hasRestoreCompleted.current,
        identityPubKey,
      });

      setDidRunNormalConnection(true);

      console.log(didWork, "did Connect to spark");
      if (!didWork) {
        setSparkInformation((prev) => ({ ...prev, didConnect: false }));
        setSparkConnectionError(error);
        console.log("Error connecting to spark wallet:", error);
        return;
      }
    },
    [accountMnemoinc],
  );

  // ─── Sync spark address to contacts profile ───────────────────────────────

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

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      pendingTransferIds.current.clear();
    };
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────

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
      sparkConnectionError,
      setSparkConnectionError,
      tokensImageCache,
      showTokensInformation,
      toggleNewestPaymentTimestamp,
      isSendingPaymentRef,
      sparkInfoRef,
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
      sparkConnectionError,
      setSparkConnectionError,
      tokensImageCache,
      showTokensInformation,
      isSendingPaymentRef,
      sparkInfoRef,
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
