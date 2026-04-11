// ============================================
// FLASHNET SWAP & LIGHTNING PAYMENT FUNCTIONS
// Based on Official Flashnet SDK Documentation v0.4.2+
// ============================================

import {
  FlashnetError,
  getErrorMetadata,
  isFlashnetError,
  isFlashnetErrorCode,
} from "@flashnet/sdk";
import {
  getFlashnetClient,
  getSingleTxDetails,
  getSparkLightningPaymentStatus,
  initializeFlashnet,
  // selectSparkRuntime,          // not used in web version
} from ".";

import i18next from "i18next";

// These are mobile-specific (webview bridge). Kept only to avoid refactor churn if devs compare files.
// In web build, you should NOT import/use them.
// import { OPERATION_TYPES, sendWebViewRequestGlobal } from '../../../context-store/webViewContext';

import {
  FLASHNET_ERROR_CODE_REGEX,
  FLASHNET_REFUND_REGEX,
  USDB_TOKEN_ID,
} from "../../constants";
import {
  isFlashnetTransfer,
  setFlashnetTransfer,
} from "./handleFlashnetTransferIds";
import Storage from "../localStorage";
import { bulkUpdateSparkTransactions } from "./transactions";
import { decode } from "bolt11";

// ============================================
// CONSTANTS
// ============================================

// Standard Bitcoin pubkey for pools (constant across Flashnet)
export const BTC_ASSET_ADDRESS =
  "020202020202020202020202020202020202020202020202020202020202020202";

export const USD_ASSET_ADDRESS =
  "3206c93b24a4d18ea19d0a9a213204af2c7e74a6d16c7535cc5d33eca4ad1eca";

export const FLASHNET_POOL_IDENTITY_KEY =
  "02894808873b896e21d29856a6d7bb346fb13c019739adb9bf0b6a8b7e28da53da";

export const DEFAULT_SLIPPAGE_BPS = 100; // 1%
export const SEND_AMOUNT_INCREASE_BUFFER = 1.01; // 1%
export const DEFAULT_MAX_SLIPPAGE_BPS = 300; // 3%
export const INTEGRATOR_FEE = 0.01; // 1%

// ============================================
// HELPER FUNCTIONS
// ============================================
const getIntegratorPublicKey = () => {
  // Supports Vite / CRA / Node-like env injection patterns
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_BLITZ_SPARK_PUBLICKEY) ||
    (typeof process !== "undefined" && process.env?.BLITZ_SPARK_PUBLICKEY) ||
    undefined
  );
};

const formatError = (error, operation) => {
  if (isFlashnetError(error)) {
    return {
      operation,
      errorCode: error.errorCode,
      category: error.category,
      message: error.userMessage,
      userMessage: i18next.t(`flashnetUserMessages.${error.errorCode}`, {
        defaultValue: error.userMessage,
      }),
      actionHint: error.actionHint,
      requestId: error.requestId,
      isRetryable: error.isRetryable,
      recovery: error.recovery,
      transferIds: error.transferIds,
      clawbackAttempted: error.wasClawbackAttempted?.() || false,
      fundsRecovered: error.wereAllTransfersRecovered?.() || false,
    };
  }

  let parsedError;
  if (typeof error === "object") {
    parsedError = error.message;
  } else {
    parsedError = error;
  }

  const match = parsedError?.match(FLASHNET_ERROR_CODE_REGEX);
  const errorCode = match?.[0] ?? null;

  if (errorCode) {
    const metadata = getErrorMetadata(errorCode);
    return {
      operation,
      errorCode,
      category: metadata.category,
      message: metadata.userMessage,
      userMessage: i18next.t(`flashnetUserMessages.${errorCode}`, {
        defaultValue: metadata.userMessage,
      }),
      actionHint: metadata.actionHint,
      isRetryable: metadata.isRetryable,
      recovery: metadata.recovery,
      transferIds: metadata.transferIds,
      clawbackAttempted: metadata.wasClawbackAttempted?.() || false,
      fundsRecovered: metadata.wereAllTransfersRecovered?.() || false,
    };
  }

  return {
    operation,
    message: error?.message || String(error),
  };
};

const getRefundTxidFromErrormessage = (message) => {
  try {
    const match = message?.match(FLASHNET_REFUND_REGEX);
    if (match) return match[1];
  } catch (err) {
    console.log("error getting txid from error message", err);
  }
  return undefined;
};

export const calculateMinOutput = (expectedOutput, slippageBps) => {
  const amount = BigInt(expectedOutput);
  const slippageFactor = BigInt(10000 - slippageBps);
  const minAmount = (amount * slippageFactor) / 10000n;
  return minAmount.toString();
};

// ============================================
// POOL DISCOVERY & QUERYING
// ============================================

export const findBestPool = async (
  mnemonic,
  tokenAAddress,
  tokenBAddress,
  options = {},
) => {
  try {
    const client = getFlashnetClient(mnemonic);

    const pools = await client.listPools({
      assetAAddress: tokenAAddress,
      assetBAddress: tokenBAddress,
      sort: "TVL_DESC",
      minTvl: options.minTvl || 1000,
      limit: options.limit || 10,
    });

    if (!pools.pools || pools.pools.length === 0) {
      throw new Error(
        i18next.t("screens.inAccount.swapsPage.noPoolsFoundError", {
          tokenAAddress,
          tokenBAddress,
        }),
      );
    }

    return {
      didWork: true,
      pool: pools.pools[0],
      totalAvailable: pools.totalCount,
    };
  } catch (error) {
    const formatted = formatError(error, "findBestPool");
    console.warn("Find best pool error:", formatted);
    if (formatted.message === "Flashnet client not initialized") {
      initializeFlashnet(mnemonic);
    }
    return {
      didWork: false,
      error: error.message,
      details: formatted,
    };
  }
};

export const getPoolDetails = async (mnemonic, poolId) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const pool = await client.getPool(poolId);

    return {
      didWork: true,
      pool,
      marketData: {
        tvl: pool.tvlAssetB,
        volume24h: pool.volume24hAssetB,
        priceChange24h: pool.priceChangePercent24h,
        currentPrice: pool.currentPriceAInB,
        reserves: {
          assetA: pool.assetAReserve,
          assetB: pool.assetBReserve,
        },
      },
    };
  } catch (error) {
    console.warn(
      "Get pool details error:",
      formatError(error, "getPoolDetails"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "getPoolDetails"),
    };
  }
};

export const listAllPools = async (mnemonic, filters = {}) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const response = await client.listPools({
      minTvl: filters.minTvl || 0,
      minVolume24h: filters.minVolume24h || 0,
      sort: filters.sort || "TVL_DESC",
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hostNames: filters.hostNames,
      curveTypes: filters.curveTypes,
    });

    return {
      didWork: true,
      pools: response.pools,
      totalCount: response.totalCount,
    };
  } catch (error) {
    console.warn("List pools error:", formatError(error, "listAllPools"));
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "listAllPools"),
    };
  }
};

export const minFlashnetSwapAmounts = async (mnemonic, assetHex) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const minMap = await client.getMinAmountsMap();

    const assetData = minMap.get(assetHex.toLowerCase());

    return {
      didWork: true,
      assetData: assetData,
    };
  } catch (error) {
    console.warn(
      "List pools error:",
      formatError(error, "minFlashnetSwapAmounts"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "minFlashnetSwapAmounts"),
    };
  }
};

// ============================================
// SWAP SIMULATION & EXECUTION
// ============================================

export const simulateSwap = async (
  mnemonic,
  {
    poolId,
    assetInAddress,
    assetOutAddress,
    amountIn,
    integratorFeeRateBps = 100,
  },
) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const simulation = await client.simulateSwap({
      poolId,
      assetInAddress,
      assetOutAddress,
      amountIn: amountIn.toString(),
      integratorBps: integratorFeeRateBps,
    });

    return {
      didWork: true,
      simulation: {
        expectedOutput: simulation.amountOut,
        executionPrice: simulation.executionPrice,
        priceImpact: simulation.priceImpactPct,
        poolId: simulation.poolId,
        feePaidAssetIn: simulation.feePaidAssetIn,
      },
    };
  } catch (error) {
    console.warn("Simulate swap error:", formatError(error, "simulateSwap"));
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "simulateSwap"),
    };
  }
};

export const executeSwap = async (
  mnemonic,
  {
    poolId,
    assetInAddress,
    assetOutAddress,
    amountIn,
    minAmountOut, // Optional - will be calculated if not provided
    maxSlippageBps = DEFAULT_SLIPPAGE_BPS,
    integratorFeeRateBps = 100,
  },
) => {
  try {
    const client = getFlashnetClient(mnemonic);

    // Simulate first if minAmountOut not provided
    let calculatedMinOut = minAmountOut;
    if (!calculatedMinOut) {
      const simulation = await client.simulateSwap({
        poolId,
        assetInAddress,
        assetOutAddress,
        amountIn: amountIn.toString(),
        integratorBps: integratorFeeRateBps,
      });
      calculatedMinOut = calculateMinOutput(
        simulation.amountOut,
        maxSlippageBps,
      );
    }
    // console.log({
    //   poolId,
    //   assetInAddress,
    //   assetOutAddress,
    //   amountIn: amountIn.toString(),
    //   minAmountOut: calculatedMinOut.toString(),
    //   maxSlippageBps,
    //   integratorFeeRateBps,
    //   integratorPublicKey: import.meta.env.VITE_BLITZ_SPARK_PUBLICKEY,
    // });
    const swap = await client.executeSwap({
      poolId,
      assetInAddress,
      assetOutAddress,
      amountIn: amountIn.toString(),
      minAmountOut: calculatedMinOut.toString(),
      maxSlippageBps,
      integratorFeeRateBps,
      integratorPublicKey: import.meta.env.VITE_BLITZ_SPARK_PUBLICKEY,
    });

    return {
      didWork: true,
      swap: {
        amountOut: swap.amountOut,
        executionPrice: swap.executionPrice,
        feeAmount: swap.feeAmount,
        flashnetRequestId: swap.flashnetRequestId,
        outboundTransferId: swap.outboundTransferId,
        poolId: swap.poolId,
      },
    };
  } catch (error) {
    const errorDetails = formatError(error, "executeSwap");
    console.warn("Execute swap error:", errorDetails);

    const id = getRefundTxidFromErrormessage(error.message);
    if (id) setFlashnetTransfer(id);

    if (isFlashnetError(error) && error.wasClawbackAttempted()) {
      errorDetails.clawbackSummary = {
        attempted: true,
        allRecovered: error.wereAllTransfersRecovered(),
        partialRecovered: error.werePartialTransfersRecovered(),
        recoveredCount: error.getRecoveredTransferCount?.() || 0,
        recoveredIds: error.getRecoveredTransferIds?.() || [],
        unrecoveredIds: error.getUnrecoveredTransferIds?.() || [],
      };
    }

    return { didWork: false, error: error.message, details: errorDetails };
  }
};

export const swapBitcoinToToken = async (
  mnemonic,
  {
    tokenAddress,
    amountSats,
    poolId = null,
    maxSlippageBps = DEFAULT_SLIPPAGE_BPS,
  },
) => {
  try {
    // Find best pool if not provided
    let targetPoolId = poolId;
    if (!targetPoolId) {
      const poolResult = await findBestPool(
        mnemonic,
        BTC_ASSET_ADDRESS,
        tokenAddress,
      );
      if (!poolResult.didWork) {
        throw new Error("No suitable pool found for BTC/" + tokenAddress);
      }
      targetPoolId = poolResult.pool.lpPublicKey;
    }

    return await executeSwap(mnemonic, {
      poolId: targetPoolId,
      assetInAddress: BTC_ASSET_ADDRESS,
      assetOutAddress: tokenAddress,
      amountIn: amountSats,
      maxSlippageBps,
    });
  } catch (error) {
    console.warn(
      "Swap BTC to token error:",
      formatError(error, "swapBitcoinToToken"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "swapBitcoinToToken"),
    };
  }
};

export const swapTokenToBitcoin = async (
  mnemonic,
  {
    tokenAddress,
    tokenAmount,
    poolId = null,
    maxSlippageBps = DEFAULT_SLIPPAGE_BPS,
  },
) => {
  try {
    // Find best pool if not provided
    let targetPoolId = poolId;
    if (!targetPoolId) {
      const poolResult = await findBestPool(
        mnemonic,
        tokenAddress,
        BTC_ASSET_ADDRESS,
      );
      if (!poolResult.didWork) {
        throw new Error("No suitable pool found for " + tokenAddress + "/BTC");
      }
      targetPoolId = poolResult.pool.lpPublicKey;
    }

    return await executeSwap(mnemonic, {
      poolId: targetPoolId,
      assetInAddress: tokenAddress,
      assetOutAddress: BTC_ASSET_ADDRESS,
      amountIn: tokenAmount,
      maxSlippageBps,
    });
  } catch (error) {
    console.warn(
      "Swap token to BTC error:",
      formatError(error, "swapTokenToBitcoin"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "swapTokenToBitcoin"),
    };
  }
};

// ============================================
// LIGHTNING PAYMENTS WITH TOKEN
// ============================================

export const getLightningPaymentQuote = async (
  mnemonic,
  invoice,
  tokenAddress,
  integratorFeeRateBps = 100,
  maxSlippageBps = DEFAULT_MAX_SLIPPAGE_BPS,
) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const quote = await client.getPayLightningWithTokenQuote(
      invoice,
      tokenAddress,
      {
        integratorFeeRateBps,
        maxSlippageBps,
      },
    );

    return {
      didWork: true,
      quote: {
        invoiceAmountSats: quote.invoiceAmountSats,
        estimatedLightningFee: quote.estimatedLightningFee,
        btcAmountRequired: quote.btcAmountRequired,
        tokenAmountRequired: quote.tokenAmountRequired,
        estimatedAmmFee: quote.estimatedAmmFee,
        executionPrice: quote.executionPrice,
        priceImpact: quote.priceImpactPct,
        poolId: quote.poolId,
        fee: quote.btcAmountRequired - quote.invoiceAmountSats,
      },
    };
  } catch (error) {
    console.warn(
      "Get Lightning quote error:",
      formatError(error, "getLightningPaymentQuote"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "getLightningPaymentQuote"),
    };
  }
};

export const payLightningWithToken = async (
  mnemonic,
  {
    invoice,
    tokenAddress,
    maxSlippageBps = DEFAULT_MAX_SLIPPAGE_BPS,
    maxLightningFeeSats = null,
    rollbackOnFailure = true,
    useExistingBtcBalance = false,
    integratorFeeRateBps = 100,
  },
) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const result = await client.payLightningWithToken({
      invoice,
      tokenAddress,
      maxSlippageBps,
      maxLightningFeeSats: maxLightningFeeSats || undefined,
      rollbackOnFailure,
      useExistingBtcBalance,
      integratorFeeRateBps,
      integratorPublicKey: getIntegratorPublicKey(),
    });

    console.log("token lightning payment response:", result);

    if (result.success) {
      return {
        didWork: true,
        result: {
          success: true,
          lightningPaymentId: result.lightningPaymentId,
          tokenAmountSpent: result.tokenAmountSpent,
          btcAmountReceived: result.btcAmountReceived,
          swapTransferId: result.swapTransferId,
          ammFeePaid: result.ammFeePaid,
          lightningFeePaid: result.lightningFeePaid,
          poolId: result.poolId,
        },
      };
    } else {
      return {
        didWork: false,
        error: result.error,
        result: {
          success: false,
          error: result.error,
          poolId: result.poolId,
          tokenAmountSpent: result.tokenAmountSpent,
          btcAmountReceived: result.btcAmountReceived,
        },
      };
    }
  } catch (error) {
    console.warn(
      "Pay Lightning with token error:",
      formatError(error, "payLightningWithToken"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "payLightningWithToken"),
    };
  }
};

// ============================================
// SWAP HISTORY
// ============================================

export const getUserSwapHistory = async (mnemonic, limit = 50, offset) => {
  try {
    const client = getFlashnetClient(mnemonic);
    let result;
    if (offset) {
      result = await client.getUserSwaps(undefined, { limit, offset });
    } else {
      result = await client.getUserSwaps(undefined, { limit });
    }

    return {
      didWork: true,
      swaps: result.swaps || [],
      totalCount: result.totalCount || 0,
    };
  } catch (error) {
    console.warn(
      "Get swap history error:",
      formatError(error, "getUserSwapHistory"),
    );
    return {
      didWork: false,
      error: error.message,
      swaps: [],
      details: formatError(error, "getUserSwapHistory"),
    };
  }
};

// ============================================
// ACTIVE SWAP TRACKING
// ============================================

let activeSwapTransferIds = new Set();

export const isSwapActive = () => activeSwapTransferIds.size > 0;

export const getActiveSwapTransferIds = () => new Set(activeSwapTransferIds);

export const addActiveSwap = (transferId) => {
  activeSwapTransferIds.add(transferId);
};

export const removeActiveSwap = (transferId) => {
  activeSwapTransferIds.delete(transferId);
};

// ============================================
// AUTO SWAP COMPLETION TRACKING
// ============================================

const PENDING_SWAP_CONFIRMATIONS_KEY = "pendingSwapConfirmations";

export const savePendingSwapConfirmation = async (
  sparkRequestID,
  outboundTransferId,
) => {
  try {
    const existing = Storage.getItem(PENDING_SWAP_CONFIRMATIONS_KEY) || {};
    existing[sparkRequestID] = {
      outboundTransferId,
      timestamp: Date.now(),
      lastChecked: null,
    };
    Storage.setItem(PENDING_SWAP_CONFIRMATIONS_KEY, existing);
  } catch (err) {
    console.error("[Swap Retry] Failed to save pending confirmation:", err);
  }
};

export const removePendingSwapConfirmation = async (sparkRequestID) => {
  try {
    const existing = Storage.getItem(PENDING_SWAP_CONFIRMATIONS_KEY);
    if (!existing) return;
    delete existing[sparkRequestID];
    Storage.setItem(PENDING_SWAP_CONFIRMATIONS_KEY, existing);
  } catch (err) {
    console.error("[Swap Retry] Failed to remove pending confirmation:", err);
  }
};

export const getPendingSwapConfirmations = async () => {
  try {
    return Storage.getItem(PENDING_SWAP_CONFIRMATIONS_KEY) || {};
  } catch (err) {
    console.error("[Swap Retry] Failed to get pending confirmations:", err);
    return {};
  }
};

export const completeSwapConfirmation = async (
  sparkRequestID,
  outboundTransferId,
  lightningRequest,
  txDetails,
  result,
  invoice,
  mnemoinc,
  sparkInfoRef,
) => {
  try {
    const realFeeAmount = Math.round(
      dollarsToSats(
        result.swap.feeAmount / Math.pow(10, 6),
        result.swap.executionPrice,
      ),
    );

    const userSwaps = await getUserSwapHistory(mnemoinc, 5);
    const swap = userSwaps.swaps.find(
      (s) => s.outboundTransferId === outboundTransferId,
    );

    if (!swap) {
      console.error("[Swap Confirmation] Swap not found in history");
      return false;
    }

    const description = invoice
      ? decode(invoice).tags.find((tag) => tag.tagName === "description")
          ?.data ||
        lightningRequest?.description ||
        ""
      : lightningRequest?.description || "";

    // Clear funding and ln payment from tx list
    setFlashnetTransfer(swap.inboundTransferId);
    setFlashnetTransfer(txDetails.id);

    let paymentType;
    if (import.meta.env.VITE_MODE === "development") {
      paymentType = "sparkrt";
    } else {
      paymentType = "spark";
    }
    const tx = {
      id: swap.outboundTransferId,
      paymentStatus: "completed",
      paymentType: paymentType,
      accountId: sparkInfoRef.current.identityPubKey,
      details: {
        fee: realFeeAmount,
        totalFee: realFeeAmount,
        supportFee: 0,
        amount: parseFloat(result.swap.amountOut),
        description: description,
        address: sparkInfoRef.current.sparkAddress,
        time: Date.now(),
        createdAt: Date.now(),
        direction: "INCOMING",
        isLRC20Payment: true,
        LRC20Token: USDB_TOKEN_ID,
        showSwapLabel: true,
        currentPriceAInB: swap.price,
        ln_funding_id: txDetails.id,
      },
    };

    await bulkUpdateSparkTransactions([tx], "fullUpdate-tokens");
    removeActiveSwap(outboundTransferId);

    await removePendingSwapConfirmation(sparkRequestID);

    console.log("[Swap Confirmation] Completed successfully");
    return true;
  } catch (err) {
    console.error("[Swap Confirmation] Error:", err);
    return false;
  }
};

export const retryPendingSwapConfirmations = async (mnemoinc, sparkInfoRef) => {
  try {
    const pending = await getPendingSwapConfirmations();
    const sparkRequestIDs = Object.keys(pending);
    if (sparkRequestIDs.length === 0) return;

    for (const sparkRequestID of sparkRequestIDs) {
      const { outboundTransferId, timestamp, lastChecked } =
        pending[sparkRequestID];
      const MAX_AGE = 24 * 60 * 60 * 1000;
      if (lastChecked && Date.now() - timestamp > MAX_AGE) {
        await removePendingSwapConfirmation(sparkRequestID);
        continue;
      }

      try {
        const updatedPending = await getPendingSwapConfirmations();
        if (updatedPending[sparkRequestID]) {
          updatedPending[sparkRequestID].lastChecked = Date.now();
          Storage.setItem(PENDING_SWAP_CONFIRMATIONS_KEY, updatedPending);
        }

        let swap = null;
        let offset = 0;
        const batchSize = 10;
        const maxSwaps = 50;

        while (!swap && offset < maxSwaps) {
          const userSwaps = await getUserSwapHistory(
            mnemoinc,
            batchSize,
            offset,
          );
          if (!userSwaps?.swaps || userSwaps.swaps.length === 0) break;
          swap = userSwaps.swaps.find(
            (s) => s.outboundTransferId === outboundTransferId,
          );
          if (!swap) offset += batchSize;
        }

        if (!swap) continue;

        const lightningRequest = await getSparkLightningPaymentStatus({
          lightningInvoiceId: sparkRequestID,
          mnemonic: mnemoinc,
        });

        if (!lightningRequest?.transfer?.sparkId) {
          await removePendingSwapConfirmation(sparkRequestID);
          continue;
        }

        const txDetails = await getSingleTxDetails(
          mnemoinc,
          lightningRequest.transfer.sparkId,
        );
        if (!txDetails) continue;

        if (isFlashnetTransfer(lightningRequest.transfer.sparkId)) {
          await removePendingSwapConfirmation(sparkRequestID);
          continue;
        }

        const fakeResult = {
          swap: {
            ...swap,
            feeAmount: swap.feePaid || 0,
            executionPrice: swap.price,
            amountOut: swap.amountOut,
          },
        };

        const invoice = lightningRequest?.invoice?.encodedInvoice || "";
        lightningRequest.description = lightningRequest?.invoice?.memo || "";

        await completeSwapConfirmation(
          sparkRequestID,
          outboundTransferId,
          lightningRequest,
          txDetails,
          fakeResult,
          invoice,
          mnemoinc,
          sparkInfoRef,
        );

        await new Promise((res) => setTimeout(res, 1000));
      } catch (err) {
        console.error(`[Swap Retry] Error processing ${sparkRequestID}:`, err);
      }
    }
  } catch (err) {
    console.error("[Swap Retry] Error in retry process:", err);
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function satsToDollars(sats, currentPriceAinB) {
  try {
    const DOLLAR_DECIMALS = 1_000_000;
    const numSats = typeof sats === "bigint" ? Number(sats) : Number(sats || 0);
    const numPrice =
      typeof currentPriceAinB === "bigint"
        ? Number(currentPriceAinB)
        : Number(currentPriceAinB || 0);
    if (isNaN(numSats) || isNaN(numPrice) || numPrice === 0) return 0;
    return (numSats * numPrice) / DOLLAR_DECIMALS;
  } catch (error) {
    console.error("Error in satsToDollars:", error);
    return 0;
  }
}

export function dollarsToSats(dollars, currentPriceAinB) {
  try {
    const DOLLAR_DECIMALS = 1_000_000;
    const numDollars =
      typeof dollars === "bigint" ? Number(dollars) : Number(dollars || 0);
    const numPrice =
      typeof currentPriceAinB === "bigint"
        ? Number(currentPriceAinB)
        : Number(currentPriceAinB || 0);
    if (isNaN(numDollars) || isNaN(numPrice) || numPrice === 0) return 0;
    return (numDollars * DOLLAR_DECIMALS) / numPrice;
  } catch (error) {
    console.error("Error in dollarsToSats:", error);
    return 0;
  }
}

export function currentPriceAinBToPriceDollars(currentPriceAInB) {
  try {
    const numPrice =
      typeof currentPriceAInB === "bigint"
        ? Number(currentPriceAInB)
        : Number(currentPriceAInB || 0);
    if (isNaN(numPrice)) return 0;
    return (numPrice * 100000000) / 1000000;
  } catch (error) {
    console.error("Error in currentPriceAinBToPriceDollars:", error);
    return 0;
  }
}

export const handleFlashnetError = (error) => {
  if (!isFlashnetErrorCode(error.errorCode)) {
    return { isFlashnetError: false, message: error.message };
  }

  const flashnetError = new FlashnetError(error.error, {
    response: { ...error },
  });

  const errorInfo = {
    isFlashnetError: true,
    errorCode: flashnetError.errorCode,
    category: flashnetError.category,
    message: flashnetError.userMessage,
    userMessage: i18next.t(`flashnetUserMessages.${flashnetError.errorCode}`, {
      defaultValue: flashnetError.userMessage,
    }),
    actionHint: flashnetError.actionHint,
    isRetryable: flashnetError.isRetryable,
    recovery: flashnetError.recovery,
  };

  if (flashnetError.isSlippageError()) {
    errorInfo.type = "slippage";
    errorInfo.userMessage = i18next.t(
      "screens.inAccount.swapsPage.slippageError",
    );
  } else if (flashnetError.isInsufficientLiquidityError()) {
    errorInfo.type = "insufficient_liquidity";
    errorInfo.userMessage = i18next.t(
      "screens.inAccount.swapsPage.noLiquidity",
    );
  } else if (flashnetError.isAuthError()) {
    errorInfo.type = "authentication";
    errorInfo.userMessage = i18next.t(
      "screens.inAccount.swapsPage.authenticationError",
    );
  } else if (flashnetError.isPoolNotFoundError()) {
    errorInfo.type = "pool_not_found";
    errorInfo.userMessage = i18next.t(
      "screens.inAccount.swapsPage.noPoolError",
    );
  }

  return errorInfo;
};

// ============================================
// CLAWBACK & RECOVERY
// ============================================

export const requestManualClawback = async (
  mnemonic,
  sparkTransferId,
  poolId,
) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const result = await client.clawback({
      sparkTransferId,
      lpIdentityPublicKey: poolId,
    });

    if (!result || result.error) {
      return {
        didWork: false,
        error: result?.error || "Clawback request failed",
      };
    }

    if (result.accepted) {
      return {
        didWork: true,
        accepted: true,
        message: "Clawback request accepted",
        internalRequestId: result.internalRequestId,
      };
    } else {
      return {
        didWork: false,
        accepted: false,
        error: result.error || "Rejected by pool",
      };
    }
  } catch (error) {
    console.warn(
      "Manual clawback error:",
      formatError(error, "requestManualClawback"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "requestManualClawback"),
    };
  }
};

export const checkClawbackEligibility = async (mnemonic, sparkTransferId) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const eligibility = await client.checkClawbackEligibility({
      sparkTransferId,
    });

    if (eligibility.accepted) {
      return { didWork: true, error: null, response: true };
    } else {
      return { didWork: true, error: eligibility.error, response: false };
    }
  } catch (error) {
    console.warn(
      "checkClawbackEligibility error:",
      formatError(error, "checkClawbackEligibility"),
    );
    return { didWork: false, error: error.message, response: false };
  }
};

export const checkClawbackStatus = async (mnemonic, internalRequestId) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const status = await client.checkClawbackStatus({ internalRequestId });

    return {
      didWork: true,
      status: status.status,
      transferId: status.transferId,
      isComplete: status.status === "completed",
      isFailed: status.status === "failed",
    };
  } catch (error) {
    console.warn(
      "Check clawback status error:",
      formatError(error, "checkClawbackStatus"),
    );
    return {
      didWork: false,
      error: error.message,
      details: formatError(error, "checkClawbackStatus"),
    };
  }
};

export const requestBatchClawback = async (mnemonic, transferIds, poolId) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const result = await client.clawbackMultiple(transferIds, poolId);
    return { didWork: true, result };
  } catch (error) {
    console.warn(
      "Batch clawback error:",
      formatError(error, "requestBatchClawback"),
    );
    return { didWork: false, error: error.message };
  }
};

export const listClawbackableTransfers = async (mnemonic, limit = 100) => {
  try {
    const client = getFlashnetClient(mnemonic);
    const response = await client.listClawbackableTransfers({ limit });
    return { didWork: true, response };
  } catch (error) {
    console.warn(
      "listClawbackableTransfers error:",
      formatError(error, "listClawbackableTransfers"),
    );
    return { didWork: false, error: error.message };
  }
};

export const calculateSwapOutput = async (mnemonic, params) => {
  return await simulateSwap(mnemonic, params);
};

export const getCurrentPrice = async (mnemonic, poolId) => {
  try {
    const poolResult = await getPoolDetails(mnemonic, poolId);
    if (!poolResult.didWork) throw new Error("Failed to get pool details");
    return {
      didWork: true,
      price: poolResult.marketData.currentPrice,
      priceChange24h: poolResult.marketData.priceChange24h,
      volume24h: poolResult.marketData.volume24h,
      tvl: poolResult.marketData.tvl,
    };
  } catch (error) {
    return { didWork: false, error: error.message };
  }
};
