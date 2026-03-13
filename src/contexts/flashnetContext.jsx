import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BTC_ASSET_ADDRESS,
  findBestPool,
  USD_ASSET_ADDRESS,
  swapBitcoinToToken,
  minFlashnetSwapAmounts,
  checkClawbackEligibility,
  requestManualClawback,
  currentPriceAinBToPriceDollars,
  addActiveSwap,
  removeActiveSwap,
  savePendingSwapConfirmation,
  completeSwapConfirmation,
  retryPendingSwapConfirmations,
  SEND_AMOUNT_INCREASE_BUFFER,
  listClawbackableTransfers,
} from "../functions/spark/flashnet";
import { useAppStatus } from "./appStatus";
import { useSpark } from "./sparkContext";
import { useActiveCustodyAccount } from "./activeAccount";
import {
  bulkUpdateSparkTransactions,
  deleteUnpaidSparkLightningTransaction,
  flashnetAutoSwapsEventListener,
  getPendingAutoSwaps,
  getSingleSparkLightningRequest,
  HANDLE_FLASHNET_AUTO_SWAP,
  updateSparkTransactionDetails,
} from "../functions/spark/transactions";
import {
  isFlashnetTransfer,
  loadSavedTransferIds,
  setFlashnetTransfer,
} from "../functions/spark/handleFlashnetTransferIds";
import { useToast } from "./toastManager";
import { useAuth } from "./authContext";
import Storage from "../functions/localStorage";
import {
  getSingleTxDetails,
  getSparkPaymentStatus,
  initializeFlashnet,
} from "../functions/spark";

const FlashnetContext = createContext(null);
const MAX_SWAP_RETRIES = 10;

export function FlashnetProvider({ children }) {
  const { showToast } = useToast();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { appState } = useAppStatus();
  const { sparkInformation, setSparkInformation } = useSpark();
  const { authState } = useAuth();

  // Use walletKey as auth reset signal (null on logout/delete)
  const authResetkey = authState.walletKey;

  const [poolInfo, setPoolInfo] = useState({});
  const [swapLimits, setSwapLimits] = useState({ usd: 1.03, bitcoin: 1030 });
  const swapLimitsRef = useRef(swapLimits);
  const poolInfoRef = useRef({});
  const poolIntervalRef = useRef(null);
  const currentWalletMnemoincRef = useRef(currentWalletMnemoinc);

  // Local sparkInfoRef synced with sparkInformation
  const sparkInfoRef = useRef(sparkInformation);

  const triggeredSwapsRef = useRef(new Set());

  const refundMonitorIntervalRef = useRef(null);
  const swapMonitorIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const flashnetRetryIntervalRef = useRef(null);
  const flashnetRetryDelayRef = useRef(5_000);
  const authResetKeyRef = useRef(authResetkey);

  const REFUND_MONITOR_INTERVAL = 25_000;
  const SWAP_MONITOR_INTERVAL = 30_000;

  useEffect(() => {
    authResetKeyRef.current = authResetkey;
  }, [authResetkey]);

  useEffect(() => {
    currentWalletMnemoincRef.current = currentWalletMnemoinc;
  }, [currentWalletMnemoinc]);

  useEffect(() => {
    poolInfoRef.current = poolInfo;
  }, [poolInfo]);

  useEffect(() => {
    swapLimitsRef.current = swapLimits;
  }, [swapLimits]);

  useEffect(() => {
    sparkInfoRef.current = sparkInformation;
  }, [sparkInformation]);

  const togglePoolInfo = (info) => {
    setPoolInfo(info);
  };

  const refreshPool = async () => {
    if (!sparkInformation.didConnectToFlashnet) return;
    if (appState !== "active") return;

    const result = await findBestPool(
      currentWalletMnemoincRef.current,
      BTC_ASSET_ADDRESS,
      USD_ASSET_ADDRESS,
    );

    if (result?.didWork && result.pool) {
      Storage.setItem("swapPoolInfo", JSON.stringify(result.pool));
      setPoolInfo(result.pool);
    }
  };

  useEffect(() => {
    function loadSavedPoolInfo() {
      const savedPoolInfo = JSON.parse(Storage.getItem("swapPoolInfo"));
      console.log("saved pool info", savedPoolInfo);
      if (savedPoolInfo) {
        setPoolInfo(savedPoolInfo);
      }
    }
    if (Object.keys(poolInfo).length) return;
    if (appState !== "active") return;
    loadSavedPoolInfo();
  }, [appState]);

  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (
      appState === "active" &&
      sparkInformation.didConnectToFlashnet &&
      currentWalletMnemoincRef.current &&
      poolInfo?.lpPublicKey
    ) {
      const capturedAuthKey = authResetKeyRef.current;

      retryTimeoutRef.current = setTimeout(() => {
        if (capturedAuthKey !== authResetKeyRef.current) {
          console.log("[Flashnet] Auth changed, skipping retry confirmations");
          return;
        }

        retryPendingSwapConfirmations(
          currentWalletMnemoincRef.current,
          sparkInfoRef,
        );
      }, 3000);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [appState, sparkInformation.didConnectToFlashnet, poolInfo?.lpPublicKey]);

  const handleAutoSwap = async (sparkRequestID, retryCount = 0) => {
    let outboundTransferId;
    try {
      const MAX_RETRIES = 7;
      const RETRY_DELAY = 2000;
      console.log("Auto-swap triggered for sparkRequestID:", sparkRequestID);
      if (triggeredSwapsRef.current.has(sparkRequestID)) {
        console.warn(
          "Auto-swap already triggered for sparkRequestID:",
          sparkRequestID,
        );
        return;
      } else {
        triggeredSwapsRef.current.add(sparkRequestID);
      }

      await updateSparkTransactionDetails(sparkRequestID, {
        swapExecuting: true,
        lastSwapAttempt: Date.now(),
      });

      const lightningRequest = await getSingleSparkLightningRequest(
        sparkRequestID,
      );

      console.log(
        "found saved lightning request invoice for",
        lightningRequest,
      );

      if (!lightningRequest) {
        console.error("Lightning request not found");
        triggeredSwapsRef.current.delete(sparkRequestID);
        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });
        return;
      }

      if (!lightningRequest.details?.finalSparkID) {
        console.error("No finalSparkID found in lightning request");
        triggeredSwapsRef.current.delete(sparkRequestID);
        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });
        return;
      }

      const txDetails = await getSingleTxDetails(
        currentWalletMnemoincRef.current,
        lightningRequest.details.finalSparkID,
      );

      if (!txDetails) {
        console.error("Transaction details not found");
        triggeredSwapsRef.current.delete(sparkRequestID);
        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });
        return;
      }

      const status = getSparkPaymentStatus(txDetails.status);

      if (status !== "completed") {
        console.log("Payment not yet settled, status:", status);

        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            triggeredSwapsRef.current.delete(sparkRequestID);
            handleAutoSwap(sparkRequestID, retryCount + 1);
          }, RETRY_DELAY);
          return;
        } else {
          console.error("Max retries reached, payment still not settled");
          triggeredSwapsRef.current.delete(sparkRequestID);
          await updateSparkTransactionDetails(sparkRequestID, {
            swapExecuting: false,
          });
          return;
        }
      }

      const userRequest = txDetails.userRequest;
      const invoice = userRequest ? userRequest.invoice?.encodedInvoice : "";

      const amountSats = txDetails.totalValue;

      if (
        !amountSats ||
        amountSats <= 0 ||
        amountSats < swapLimitsRef.current.bitcoin
      ) {
        console.error("Invalid amount for swap");
        triggeredSwapsRef.current.delete(sparkRequestID);
        deleteUnpaidSparkLightningTransaction(sparkRequestID);

        const tx = {
          id: lightningRequest.details?.finalSparkID,
          accountId: sparkInfoRef.current.identityPubKey,
          paymentStatus: "completed",
          paymentType: "lightning",
          details: {
            performSwaptoUSD: false,
          },
        };
        await bulkUpdateSparkTransactions([tx]);
        return;
      }

      const currentPoolInfo = poolInfoRef.current;
      if (!currentPoolInfo || !currentPoolInfo.lpPublicKey) {
        console.error("Pool info not available");
        triggeredSwapsRef.current.delete(sparkRequestID);
        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });
        return;
      }

      console.log("Executing auto-swap:", {
        amount: amountSats,
        poolId: currentPoolInfo.lpPublicKey,
      });

      await updateSparkTransactionDetails(sparkRequestID, {
        swapInitiated: true,
        swapAmount: amountSats,
      });

      const result = await swapBitcoinToToken(
        currentWalletMnemoincRef.current,
        {
          tokenAddress: USD_ASSET_ADDRESS,
          amountSats: amountSats,
          poolId: currentPoolInfo.lpPublicKey,
        },
      );

      if (result.didWork && result.swap) {
        outboundTransferId = result.swap.outboundTransferId;
        addActiveSwap(result.swap.outboundTransferId);
        savePendingSwapConfirmation(sparkRequestID, outboundTransferId);
        await updateSparkTransactionDetails(lightningRequest.sparkID, {
          completedSwaptoUSD: true,
          swapExecuting: false,
          swapRetryCount: 0,
        });

        console.log("Auto-swap completed successfully:", {
          amountOut: result.swap.amountOut,
          executionPrice: result.swap.executionPrice,
        });

        const success = await completeSwapConfirmation(
          sparkRequestID,
          outboundTransferId,
          lightningRequest,
          txDetails,
          result,
          invoice,
          currentWalletMnemoincRef.current,
          sparkInfoRef,
        );

        if (!success) {
          console.warn(
            "[Auto-swap] Confirmation failed, will retry on next load",
          );
        }
      } else {
        console.error("Auto-swap failed:", result.error);

        if (outboundTransferId) {
          removeActiveSwap(sparkRequestID);
        }

        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });

        triggeredSwapsRef.current.delete(sparkRequestID);
      }
    } catch (error) {
      console.error("Error in auto-swap handler:", error);
      if (outboundTransferId) {
        removeActiveSwap(outboundTransferId);
      }
      try {
        await updateSparkTransactionDetails(sparkRequestID, {
          swapExecuting: false,
        });
      } catch (updateError) {
        console.error("Failed to update swap status:", updateError);
      }

      triggeredSwapsRef.current.delete(sparkRequestID);
    }
  };

  const runPendingSwapsMonitor = async () => {
    try {
      if (appState !== "active") return;
      if (!sparkInformation.didConnectToFlashnet) return;
      if (!currentWalletMnemoincRef.current) return;
      if (!poolInfoRef.current?.lpPublicKey) return;

      console.log("[Pending Swaps Monitor] Checking for stuck swaps...");

      const pendingSwaps = await getPendingAutoSwaps();

      if (!pendingSwaps || pendingSwaps.length === 0) {
        return;
      }

      console.log(
        `[Pending Swaps Monitor] Found ${pendingSwaps.length} pending swap(s)`,
      );

      for (const swapRequest of pendingSwaps) {
        const sparkID = swapRequest.sparkID;
        const details = swapRequest.details || {};
        const finalSparkID = details.finalSparkID;

        if (triggeredSwapsRef.current.has(sparkID)) {
          console.log(
            `[Pending Swaps Monitor] Swap ${sparkID} already processing`,
          );
          continue;
        }

        if (details.completedSwaptoUSD || isFlashnetTransfer(finalSparkID)) {
          console.warn(
            "[Pending Swaps Monitor] Blocking already completed swaps",
          );
          continue;
        }

        const currentRetries = details.swapRetryCount || 0;
        if (currentRetries >= MAX_SWAP_RETRIES) {
          console.error(
            `[Pending Swaps Monitor] Swap ${sparkID} exceeded max retries (${MAX_SWAP_RETRIES}), cleaning up`,
          );

          await deleteUnpaidSparkLightningTransaction(sparkID);

          if (finalSparkID) {
            const tx = {
              id: finalSparkID,
              accountId: sparkInfoRef.current.identityPubKey,
              paymentStatus: "completed",
              paymentType: "lightning",
              details: {
                performSwaptoUSD: false,
              },
            };
            await bulkUpdateSparkTransactions([tx]);
          }

          continue;
        }

        if (details.swapExecuting) {
          const lastAttempt = details.lastSwapAttempt || 0;
          const timeSinceAttempt = Date.now() - lastAttempt;
          const EXECUTION_TIMEOUT = 2 * 60 * 1000;

          console.log(
            `[Pending Swaps Monitor] Swap ${sparkID} marked as executing`,
          );

          if (isFlashnetTransfer(finalSparkID)) {
            console.log(
              `[Pending Swaps Monitor] Swap ${sparkID} was already completed, marking as such`,
            );
            await updateSparkTransactionDetails(sparkID, {
              completedSwaptoUSD: true,
              swapExecuting: false,
            });
            continue;
          }

          if (timeSinceAttempt > EXECUTION_TIMEOUT) {
            console.log(
              `[Pending Swaps Monitor] Swap ${sparkID} execution timeout, resetting and retrying`,
            );
            await updateSparkTransactionDetails(sparkID, {
              swapExecuting: false,
              swapRetryCount: currentRetries + 1,
            });
          } else {
            console.log(
              `[Pending Swaps Monitor] Swap ${sparkID} still within execution window`,
            );
            continue;
          }
        } else {
          await updateSparkTransactionDetails(sparkID, {
            swapRetryCount: currentRetries + 1,
          });
        }

        console.log(`[Pending Swaps Monitor] Retrying swap ${sparkID}`);

        handleAutoSwap(sparkID);

        await new Promise((res) => setTimeout(res, 1000));
      }
    } catch (err) {
      console.error("[Pending Swaps Monitor] error:", err);
    }
  };

  const startPendingSwapsMonitor = () => {
    if (swapMonitorIntervalRef.current) return;

    const capturedAuthKey = authResetKeyRef.current;

    runPendingSwapsMonitor();

    swapMonitorIntervalRef.current = setInterval(async () => {
      if (capturedAuthKey !== authResetKeyRef.current) {
        console.log("[Pending Swaps Monitor] Auth changed, stopping monitor");
        stopPendingSwapsMonitor();
        return;
      }

      await runPendingSwapsMonitor();
    }, SWAP_MONITOR_INTERVAL);
  };

  const stopPendingSwapsMonitor = () => {
    if (!swapMonitorIntervalRef.current) return;

    clearInterval(swapMonitorIntervalRef.current);
    swapMonitorIntervalRef.current = null;
  };

  const runRefundMonitor = async () => {
    try {
      if (appState !== "active") return;
      if (!sparkInformation.didConnectToFlashnet) return;
      if (!currentWalletMnemoincRef.current) return;

      const refundableTransfers = await listClawbackableTransfers(
        currentWalletMnemoincRef.current,
        50,
      );

      if (
        !refundableTransfers?.didWork ||
        !refundableTransfers.resposne?.transfers.length
      )
        return;

      const uniqueTransfers = Array.from(
        new Map(
          refundableTransfers.resposne.transfers.map((t) => [t.id, t]),
        ).values(),
      );

      for (const transfer of uniqueTransfers) {
        const transferId = transfer.id;

        const eligibility = await checkClawbackEligibility(
          currentWalletMnemoincRef.current,
          transferId,
        );

        if (eligibility.didWork && eligibility.response) {
          console.warn("[Flashnet Refund Monitor] Refundable", transferId);

          const response = await requestManualClawback(
            currentWalletMnemoincRef.current,
            transferId,
            transfer.lpIdentityPublicKey,
          );

          if (response.didWork && response.accepted) {
            await new Promise((res) => setTimeout(res, 500));
          }
        }
      }
    } catch (err) {
      console.error("[Flashnet Refund Monitor] error:", err);
    }
  };

  const startRefundMonitor = () => {
    if (refundMonitorIntervalRef.current) return;

    const capturedAuthKey = authResetKeyRef.current;

    refundMonitorIntervalRef.current = setInterval(async () => {
      if (capturedAuthKey !== authResetKeyRef.current) {
        console.log("[Refund Monitor] Auth changed, stopping monitor");
        stopRefundMonitor();
        return;
      }

      await runRefundMonitor();
    }, REFUND_MONITOR_INTERVAL);
  };

  const stopRefundMonitor = () => {
    if (!refundMonitorIntervalRef.current) return;

    clearInterval(refundMonitorIntervalRef.current);
    refundMonitorIntervalRef.current = null;
  };

  // Set up the auto-swap event listener
  useEffect(() => {
    flashnetAutoSwapsEventListener.on(
      HANDLE_FLASHNET_AUTO_SWAP,
      handleAutoSwap,
    );

    loadSavedTransferIds();

    return () => {
      flashnetAutoSwapsEventListener.off(
        HANDLE_FLASHNET_AUTO_SWAP,
        handleAutoSwap,
      );
    };
  }, []);

  useEffect(() => {
    if (
      appState === "active" &&
      sparkInformation.didConnectToFlashnet &&
      poolInfo?.lpPublicKey
    ) {
      startPendingSwapsMonitor();
    } else {
      stopPendingSwapsMonitor();
    }

    return stopPendingSwapsMonitor;
  }, [appState, sparkInformation.didConnectToFlashnet, poolInfo?.lpPublicKey]);

  useEffect(() => {
    let refundMonitorTimeout;
    if (appState === "active" && sparkInformation.didConnectToFlashnet) {
      const capturedAuthKey = authResetKeyRef.current;

      refundMonitorTimeout = setTimeout(() => {
        if (capturedAuthKey !== authResetKeyRef.current) {
          console.log("[Refund Monitor] Auth changed, skipping initial run");
          return;
        }
        runRefundMonitor();
      }, 1500);

      startRefundMonitor();
    } else {
      stopRefundMonitor();
    }

    return () => {
      if (refundMonitorTimeout) {
        clearTimeout(refundMonitorTimeout);
      }
      stopRefundMonitor();
    };
  }, [appState, sparkInformation.didConnectToFlashnet]);

  useEffect(() => {
    const INITIAL_RETRY_DELAY = 5_000;
    const MAX_RETRY_DELAY = 120_000;

    const attemptFlashnetConnection = async () => {
      try {
        if (
          sparkInformation.didConnect === true &&
          sparkInformation.didConnectToFlashnet === false &&
          appState === "active" &&
          currentWalletMnemoincRef.current
        ) {
          console.log(
            `[Flashnet Retry] Attempting to initialize Flashnet... (delay: ${flashnetRetryDelayRef.current}ms)`,
          );

          const result = await initializeFlashnet(
            currentWalletMnemoincRef.current,
          );

          if (result === true) {
            console.log("[Flashnet Retry] Successfully initialized Flashnet");
            setSparkInformation((prev) => ({
              ...prev,
              didConnectToFlashnet: true,
            }));

            flashnetRetryDelayRef.current = INITIAL_RETRY_DELAY;

            if (flashnetRetryIntervalRef.current) {
              clearTimeout(flashnetRetryIntervalRef.current);
              flashnetRetryIntervalRef.current = null;
            }
          } else {
            console.warn(
              `[Flashnet Retry] Failed to initialize, will retry in ${
                flashnetRetryDelayRef.current / 1000
              }s...`,
            );

            if (flashnetRetryIntervalRef.current) {
              clearTimeout(flashnetRetryIntervalRef.current);
            }

            const capturedAuthKey = authResetKeyRef.current;

            flashnetRetryIntervalRef.current = setTimeout(() => {
              if (capturedAuthKey !== authResetKeyRef.current) {
                console.log("[Flashnet Retry] Auth changed, aborting retry");
                return;
              }
              attemptFlashnetConnection();
            }, flashnetRetryDelayRef.current);

            flashnetRetryDelayRef.current = Math.min(
              flashnetRetryDelayRef.current * 2,
              MAX_RETRY_DELAY,
            );
          }
        }
      } catch (error) {
        console.error("[Flashnet Retry] Error during initialization:", error);

        if (flashnetRetryIntervalRef.current) {
          clearTimeout(flashnetRetryIntervalRef.current);
        }

        const capturedAuthKey = authResetKeyRef.current;

        flashnetRetryIntervalRef.current = setTimeout(() => {
          if (capturedAuthKey !== authResetKeyRef.current) {
            console.log(
              "[Flashnet Retry] Auth changed, aborting retry after error",
            );
            return;
          }
          attemptFlashnetConnection();
        }, flashnetRetryDelayRef.current);

        flashnetRetryDelayRef.current = Math.min(
          flashnetRetryDelayRef.current * 2,
          MAX_RETRY_DELAY,
        );
      }
    };

    if (
      sparkInformation.didConnect === true &&
      sparkInformation.didConnectToFlashnet === false &&
      appState === "active"
    ) {
      flashnetRetryDelayRef.current = INITIAL_RETRY_DELAY;
      attemptFlashnetConnection();
    } else {
      if (flashnetRetryIntervalRef.current) {
        clearTimeout(flashnetRetryIntervalRef.current);
        flashnetRetryIntervalRef.current = null;
      }

      flashnetRetryDelayRef.current = INITIAL_RETRY_DELAY;
    }

    return () => {
      if (flashnetRetryIntervalRef.current) {
        clearTimeout(flashnetRetryIntervalRef.current);
        flashnetRetryIntervalRef.current = null;
      }
    };
  }, [
    sparkInformation.didConnect,
    sparkInformation.didConnectToFlashnet,
    appState,
  ]);

  useEffect(() => {
    if (poolIntervalRef.current) {
      clearInterval(poolIntervalRef.current);
      poolIntervalRef.current = null;
    }

    if (!sparkInformation.didConnectToFlashnet) return;
    if (appState !== "active") return;

    const capturedAuthKey = authResetKeyRef.current;

    poolIntervalRef.current = setInterval(() => {
      if (capturedAuthKey !== authResetKeyRef.current) {
        console.log("[Pool Refresh] Auth changed, stopping refresh");
        if (poolIntervalRef.current) {
          clearInterval(poolIntervalRef.current);
          poolIntervalRef.current = null;
        }
        return;
      }

      refreshPool();
    }, 30_000);

    const refreshPoolTimeout = setTimeout(() => {
      if (capturedAuthKey !== authResetKeyRef.current) {
        console.log("[Pool Refresh] Auth changed, skipping initial refresh");
        return;
      }
      refreshPool();
    }, 2000);

    return () => {
      if (refreshPoolTimeout) {
        clearTimeout(refreshPoolTimeout);
      }

      if (poolIntervalRef.current) {
        clearInterval(poolIntervalRef.current);
        poolIntervalRef.current = null;
      }
    };
  }, [appState, sparkInformation.didConnectToFlashnet]);

  useEffect(() => {
    if (!sparkInformation.didConnectToFlashnet) return;
    async function getLimits() {
      const [usdLimits, bitcoinLimits] = await Promise.all([
        minFlashnetSwapAmounts(
          currentWalletMnemoincRef.current,
          USD_ASSET_ADDRESS,
        ),
        minFlashnetSwapAmounts(
          currentWalletMnemoincRef.current,
          BTC_ASSET_ADDRESS,
        ),
      ]);
      if (usdLimits.didWork && bitcoinLimits.didWork) {
        setSwapLimits({
          usd: parseFloat(
            (
              (Number(usdLimits.assetData) / 1000000) *
              SEND_AMOUNT_INCREASE_BUFFER
            ).toFixed(2),
          ),
          bitcoin: Math.round(
            Number(bitcoinLimits.assetData) * SEND_AMOUNT_INCREASE_BUFFER,
          ),
        });
      }
    }
    getLimits();
  }, [sparkInformation.didConnectToFlashnet]);

  const swapUSDPriceDollars = useMemo(() => {
    return currentPriceAinBToPriceDollars(poolInfo?.currentPriceAInB);
  }, [poolInfo?.currentPriceAInB]);

  // Clean up all intervals and timeouts when auth resets
  useEffect(() => {
    console.log("[Flashnet] Auth reset detected, cleaning up all processes");

    stopRefundMonitor();
    stopPendingSwapsMonitor();

    if (poolIntervalRef.current) {
      clearInterval(poolIntervalRef.current);
      poolIntervalRef.current = null;
    }

    if (flashnetRetryIntervalRef.current) {
      clearTimeout(flashnetRetryIntervalRef.current);
      flashnetRetryIntervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    triggeredSwapsRef.current.clear();
    flashnetRetryDelayRef.current = 5_000;
  }, [authResetkey]);

  const contextValue = useMemo(() => {
    return {
      poolInfo,
      togglePoolInfo,
      poolInfoRef: poolInfoRef.current,
      swapLimits,
      swapUSDPriceDollars,
    };
  }, [poolInfo, swapLimits, swapUSDPriceDollars]);

  return (
    <FlashnetContext.Provider value={contextValue}>
      {children}
    </FlashnetContext.Provider>
  );
}

export const useFlashnet = () => useContext(FlashnetContext);
