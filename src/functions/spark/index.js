import {
  decodeSparkAddress,
  getNetworkFromSparkAddress,
  isValidSparkAddress,
  SparkWallet,
} from "@buildonspark/spark-sdk";
import { getAllSparkTransactions } from "./transactions";
import { SPARK_TO_SPARK_FEE } from "../../constants/math";
import {
  LightningSendRequestStatus,
  SparkCoopExitRequestStatus,
  LightningReceiveRequestStatus,
  SparkLeavesSwapRequestStatus,
  SparkUserRequestStatus,
  ClaimStaticDepositStatus,
} from "@buildonspark/spark-sdk/types";
import sha256Hash from "../hash";
import {
  mergeTokensWithCache,
  migrateCachedTokens,
  saveCachedTokens,
} from "../lrc20/cachedTokens";
import Storage from "../localStorage";
import { FlashnetClient } from "@flashnet/sdk";
import { DEFAULT_PAYMENT_EXPIRY_SEC } from "../../constants";

export let sparkWallet = {};
export let flashnetClients = {};
let initializingWallets = {};

// Hash cache to avoid recalculating hashes
const mnemonicHashCache = new Map();

const getMnemonicHash = (mnemonic) => {
  if (!mnemonicHashCache.has(mnemonic)) {
    mnemonicHashCache.set(mnemonic, sha256Hash(mnemonic));
  }
  return mnemonicHashCache.get(mnemonic);
};

// Centralizes wallet lookup and error handling, reducing code duplication
export const getWallet = async (mnemonic) => {
  const hash = getMnemonicHash(mnemonic);
  let wallet = sparkWallet[hash];

  if (!wallet) {
    if (initializingWallets[hash]) {
      await initializingWallets[hash];
      return sparkWallet[hash];
    }
    console.log("Creating native wallet because none exists");
    initializingWallets[hash] = initializeWallet(mnemonic);
    wallet = await initializingWallets[hash];
    sparkWallet[hash] = wallet;
    delete initializingWallets[hash]; // cleanup after done
  }

  return wallet;
};

export const getFlashnetClient = (mnemonic) => {
  const hash = getMnemonicHash(mnemonic);
  const client = flashnetClients[hash];
  if (!client) {
    throw new Error("Flashnet client not initialized");
  }
  return client;
};

// Clear cache when needed (call this on logout/cleanup)
export const clearMnemonicCache = () => {
  mnemonicHashCache.clear();
  Object.keys(sparkWallet).forEach((key) => delete sparkWallet[key]);
};

export const initializeSparkWallet = async (
  mnemonic,
  isInitialLoad = true,
  options = {},
) => {
  const {
    maxRetries = 8,
    retryDelay = 15000, // 15 seconds between retries
    enableRetry = true,
  } = options;

  const attemptInitialization = async (attemptNumber = 0) => {
    try {
      const hash = getMnemonicHash(mnemonic);

      // Early return if already initialized
      if (sparkWallet[hash]) {
        return { isConnected: true };
      }
      if (initializingWallets[hash]) {
        await initializingWallets[hash];
        return { isConnected: true };
      }
      initializingWallets[hash] = (async () => {
        try {
          const wallet = await initializeWallet(mnemonic);
          sparkWallet[hash] = wallet;
          return wallet;
        } catch (err) {
          delete initializingWallets[hash]; // cleanup after done
          delete sparkWallet[hash];
          throw err;
        }
      })();

      await initializingWallets[hash];
      delete initializingWallets[hash];

      return { isConnected: true };
    } catch (err) {
      console.log(
        `Initialize spark wallet error (attempt ${attemptNumber + 1}/${
          maxRetries + 1
        }):`,
        err,
      );

      const hash = getMnemonicHash(mnemonic);
      delete initializingWallets[hash];
      delete sparkWallet[hash];

      // If retry is disabled or max retries reached, return error
      if (!enableRetry || attemptNumber >= maxRetries) {
        return { isConnected: false, error: err.message };
      }

      // Log retry attempt
      console.log(
        `Wallet failed to connect. Retrying in ${
          retryDelay / 1000
        } seconds... (${attemptNumber + 1}/${maxRetries} retries)`,
      );

      // Wait before retry
      await new Promise((res) => setTimeout(res, retryDelay));

      // Recursive retry
      return attemptInitialization(attemptNumber + 1);
    }
  };

  return attemptInitialization(0);
};

const initializeWallet = async (mnemonic) => {
  const { wallet } = await SparkWallet.initialize({
    mnemonicOrSeed: mnemonic,
    options: {
      network: "MAINNET",
      optimizationOptions: {
        multiplicity: 2,
      },
    },
  });

  console.log("did initialize wallet");
  return wallet;
};

export const initializeFlashnet = async (mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    const flashnetAPI = new FlashnetClient(wallet, {
      autoAuthenticate: true,
    });
    await flashnetAPI.initialize();

    flashnetClients[sha256Hash(mnemonic)] = flashnetAPI;
    return true;
  } catch (err) {
    console.log("Error initializing flashnet", err);
    return false;
  }
};

export const setPrivacyEnabled = async (mnemonic, freshIdentityPubKey) => {
  try {
    const didSetPrivacySetting =
      Storage.getItem("didSetPrivacySettingNew") || {};

    const currentWallet = didSetPrivacySetting[freshIdentityPubKey];

    if (currentWallet) return;

    const wallet = await getWallet(mnemonic);
    const walletSetings = await wallet.getWalletSettings();
    if (!walletSetings?.privateEnabled) {
      await wallet.setPrivacyEnabled(true);
    }
    didSetPrivacySetting[freshIdentityPubKey] = true;
    Storage.setItem("didSetPrivacySettingNew", didSetPrivacySetting);

    return true;
  } catch (err) {
    console.log("Get spark balance error", err);
  }
};

export const getSparkIdentityPubKey = async (mnemonic) => {
  try {
    // Now uses optimized getWallet helper
    const wallet = await getWallet(mnemonic);
    return await wallet.getIdentityPublicKey();
  } catch (err) {
    console.log("Get spark balance error", err);
  }
};

export const getSparkBalance = async (mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    const hash = getMnemonicHash(mnemonic);
    const balance = await wallet.getBalance();
    const cachedTokens = await migrateCachedTokens(mnemonic);

    let currentTokensObj = {};
    for (const [tokensIdentifier, tokensData] of balance.tokenBalances) {
      currentTokensObj[tokensIdentifier] = {
        ...tokensData,
        balance: tokensData.availableToSendBalance,
      };
    }

    console.log(currentTokensObj, cachedTokens);

    const allTokens = mergeTokensWithCache(
      currentTokensObj,
      cachedTokens,
      mnemonic,
    );

    await saveCachedTokens(allTokens);

    return {
      tokensObj: allTokens[hash],
      balance: balance.balance,
      didWork: true,
    };
  } catch (err) {
    console.log("Get spark balance error", err);
    return { didWork: false };
  }
};

export const getSparkStaticBitcoinL1Address = async (mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getStaticDepositAddress();
  } catch (err) {
    console.log("Get reusable Bitcoin mainchain address error", err);
  }
};

export const queryAllStaticDepositAddresses = async (mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.queryStaticDepositAddresses();
  } catch (err) {
    console.log("refund reusable Bitcoin mainchain address error", err);
  }
};

export const getSparkStaticBitcoinL1AddressQuote = async (txid, mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    const quote = await wallet.getClaimStaticDepositQuote(txid);
    return { didwork: true, quote };
  } catch (err) {
    console.log("Get reusable Bitcoin mainchain address quote error", err);
    return { didwork: false, error: err.message };
  }
};

export const refundSparkStaticBitcoinL1AddressQuote = async ({
  depositTransactionId,
  destinationAddress,
  fee,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.refundStaticDeposit({
      depositTransactionId,
      destinationAddress,
      fee,
    });
  } catch (err) {
    console.log("refund reusable Bitcoin mainchain address error", err);
  }
};

export const claimnSparkStaticDepositAddress = async ({
  creditAmountSats,
  outputIndex,
  sspSignature,
  transactionId,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.claimStaticDeposit({
      creditAmountSats,
      sspSignature,
      transactionId,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("claim static deposit address error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkAddress = async (mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.getSparkAddress();
    return { didWork: true, response };
  } catch (err) {
    console.log("Get spark address error", err);
    return { didWork: false, error: err.message };
  }
};

export const sendSparkPayment = async ({
  receiverSparkAddress,
  amountSats,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.transfer({
      receiverSparkAddress: receiverSparkAddress.toLowerCase(),
      amountSats,
    });
    console.log("spark payment response", response);
    return { didWork: true, response };
  } catch (err) {
    console.log("Send spark payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const sendSparkTokens = async ({
  tokenIdentifier,
  tokenAmount,
  receiverSparkAddress,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.transferTokens({
      tokenIdentifier,
      tokenAmount: BigInt(tokenAmount),
      receiverSparkAddress,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Send spark token error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkLightningPaymentFeeEstimate = async (
  invoice,
  amountSat,
  mnemonic,
) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.getLightningSendFeeEstimate({
      encodedInvoice: invoice.toLowerCase(),
      amountSats: amountSat,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Get lightning payment fee error", err);
    return { didWork: false, error: err.message };
  }
};

/**
 * Extracts the hex-encoded identity public key from a Spark address string.
 * Uses SDK static utilities — no wallet instance required.
 * @param {string} address - A bech32m Spark address
 * @returns {string} Hex-encoded secp256k1 compressed public key
 */
export const extractPubkeyFromSparkAddress = (address) => {
  if (!address || typeof address !== "string") {
    throw new Error(
      "extractPubkeyFromSparkAddress: address must be a non-empty string",
    );
  }
  if (!isValidSparkAddress(address)) {
    throw new Error(
      `extractPubkeyFromSparkAddress: invalid Spark address: ${address}`,
    );
  }
  const network = getNetworkFromSparkAddress(address);
  const decoded = decodeSparkAddress(address, network);
  if (!decoded?.identityPublicKey) {
    throw new Error(
      `extractPubkeyFromSparkAddress: could not decode pubkey from: ${address}`,
    );
  }
  return decoded.identityPublicKey;
};

/**
 * Creates a Spark sats invoice routed to the holder of the given Spark address.
 * Uses createSatsInvoice with receiverIdentityPubkey — no recipient private key needed.
 * Native path only (WebView createSatsInvoice handler ignores receiverIdentityPubkey).
 * @param {{ address: string, amountSats: number, mnemonic: string }} params
 * @returns {Promise<{ didWork: boolean, invoice?: string, error?: string }>}
 */
export const generateSparkInvoiceFromAddress = async ({
  address,
  amountSats,
  mnemonic,
}) => {
  try {
    if (
      typeof amountSats !== "number" ||
      !Number.isInteger(amountSats) ||
      amountSats <= 0 ||
      !Number.isSafeInteger(amountSats)
    ) {
      throw new Error(
        `generateSparkInvoiceFromAddress: amountSats must be a positive safe integer, got: ${amountSats}`,
      );
    }

    const receiverIdentityPubkey = extractPubkeyFromSparkAddress(address);

    const wallet = await getWallet(mnemonic);
    const invoice = await wallet.createSatsInvoice({
      amount: amountSats,
      receiverIdentityPubkey,
    });
    console.log(invoice);
    return { didWork: true, invoice };
  } catch (err) {
    console.log("generateSparkInvoiceFromAddress error", err);
    return { didWork: false, error: err.message };
  }
};

export const fufillSparkInvoices = async ({ mnemonic, invoices = [] }) => {
  try {
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return {
        successful: [],
        failed: [],
        totalPaid: 0,
        error: "No recipients provided",
      };
    }

    const wallet = await getWallet(mnemonic);
    const fulfillResult = await wallet.fulfillSparkInvoice(invoices);
    return { didWork: true, fulfillResult };
  } catch (err) {
    console.log("generateSparkInvoiceFromAddress error", err);
    return { didWork: false, error: err.message };
  }
};

export const batchSendTokens = async ({ mnemonic, invoices = [] }) => {
  try {
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return {
        successful: [],
        failed: [],
        totalPaid: 0,
        error: "No recipients provided",
      };
    }

    const wallet = await getWallet(mnemonic);
    const fulfillResult = await wallet.batchTransferTokens(invoices);
    return { didWork: true, invoice: fulfillResult };
  } catch (err) {
    console.log("generateSparkInvoiceFromAddress error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkBitcoinPaymentRequest = async (paymentId, mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getCoopExitRequest(paymentId);
  } catch (err) {
    console.log("Get bitcoin payment fee estimate error", err);
  }
};

export const getSparkBitcoinPaymentFeeEstimate = async ({
  amountSats,
  withdrawalAddress,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.getWithdrawalFeeQuote({
      amountSats,
      withdrawalAddress: withdrawalAddress,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Get bitcoin payment fee estimate error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkPaymentFeeEstimate = async (amountSats, mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    const feeResponse = await wallet.getSwapFeeEstimate(amountSats);
    return feeResponse.feeEstimate.originalValue || SPARK_TO_SPARK_FEE;
  } catch (err) {
    console.log("Get bitcoin payment fee estimate error", err);
    return SPARK_TO_SPARK_FEE;
  }
};

export const receiveSparkLightningPayment = async ({
  amountSats,
  memo,
  mnemonic,
  includeSparkAddress = true,
  expirySeconds = DEFAULT_PAYMENT_EXPIRY_SEC, // 12 hour invoice expiry
  receiverIdentityPubkey,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.createLightningInvoice({
      amountSats,
      memo,
      expirySeconds,
      includeSparkAddress,
      receiverIdentityPubkey,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Receive lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const claimSparkHodlLightningPayment = async ({
  preimage,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.claimHTLC(preimage);
    return { didWork: true, response };
  } catch (err) {
    console.log("Receive HODL lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const querySparkHodlLightningPayments = async ({
  paymentHashes = [],
  mnemonic,
}) => {
  try {
    const runtime = await selectSparkRuntime(mnemonic);

    const wallet = await getWallet(mnemonic);
    const response = await await wallet.queryHTLC({
      paymentHashes,
      limit: 50,
      offset: 0,
    });
    const paidPreimages = response.preimageRequests.map((request) => ({
      status: request.status,
      createdTime: request.createdTime,
      paymentHash: Buffer.from(request.paymentHash).toString("hex"),
      transferId: request.transfer.id,
      satValue: request.transfer.totalValue,
    }));
    return { didWork: true, paidPreimages };
  } catch (err) {
    console.log("Receive HODL lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const receiveSparkHodlLightningPayment = async ({
  amountSats,
  paymentHash,
  memo,
  expirySeconds,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.createLightningHodlInvoice({
      amountSats,
      paymentHash,
      memo,
      expirySeconds,
      includeSparkAddress: false,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Receive HODL lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkLightningSendRequest = async (id, mnemonic) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getLightningSendRequest(id);
  } catch (err) {
    console.log("Get spark lightning send request error", err);
  }
};

export const getSparkLightningPaymentStatus = async ({
  lightningInvoiceId,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getLightningReceiveRequest(lightningInvoiceId);
  } catch (err) {
    console.log("Get lightning payment status error", err);
  }
};

export const sendSparkLightningPayment = async ({
  invoice,
  maxFeeSats,
  amountSats,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const paymentResponse = await wallet.payLightningInvoice({
      invoice: invoice.toLowerCase(),
      maxFeeSats: maxFeeSats,
      amountSatsToSend: amountSats,
      preferSpark: true,
    });
    return { didWork: true, paymentResponse };
  } catch (err) {
    console.log("Send lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const getUtxosForDepositAddress = async ({
  depositAddress,
  mnemonic,
  limit = 100,
  offset = 0,
  excludeClaimed = true,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const utxos = await wallet.getUtxosForDepositAddress(
      depositAddress,
      limit,
      offset,
      excludeClaimed,
    );
    return { didWork: true, utxos };
  } catch (err) {
    console.log("Send Bitcoin payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const sendSparkBitcoinPayment = async ({
  onchainAddress,
  exitSpeed,
  amountSats,
  feeQuote,
  deductFeeFromWithdrawalAmount = false,
  mnemonic,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const paymentFee =
      (feeQuote.l1BroadcastFeeFast?.originalValue || 0) +
      (feeQuote.userFeeFast?.originalValue || 0);

    const response = await wallet.withdraw({
      onchainAddress: onchainAddress,
      amountSats,
      exitSpeed,
      feeQuoteId: feeQuote.id,
      feeAmountSats: paymentFee,
      deductFeeFromWithdrawalAmount,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Send Bitcoin payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkTransactions = async (
  transferCount = 100,
  offsetIndex,
  mnemonic,
) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getTransfers(transferCount, offsetIndex);
  } catch (err) {
    console.log("get spark transactions error", err);
    return { transfers: [] };
  }
};

export const getSparkTokenTransactions = async ({
  ownerPublicKeys,
  issuerPublicKeys,
  tokenTransactionHashes,
  tokenIdentifiers,
  outputIds,
  mnemonic,
  lastSavedTransactionId,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const response = await wallet.queryTokenTransactions({
      ownerPublicKeys,
      issuerPublicKeys,
      tokenTransactionHashes,
      tokenIdentifiers,
      outputIds,
    });

    let filteredTransactions = response.tokenTransactionsWithStatus;
    if (lastSavedTransactionId) {
      const lastIndex = response.tokenTransactionsWithStatus.findIndex(
        (tx) =>
          Buffer.from(Object.values(tx.tokenTransactionHash)).toString(
            "hex",
          ) === lastSavedTransactionId,
      );

      if (lastIndex !== -1) {
        filteredTransactions = response.tokenTransactionsWithStatus.slice(
          0,
          lastIndex,
        );
      }
    }
    return {
      tokenTransactionsWithStatus: filteredTransactions,
      offset: response.offset,
    };
  } catch (err) {
    console.log("get spark transactions error", err);
    return [];
  }
};

export const createSatsInvoice = async ({
  mnemonic,
  amountSats,
  memo,
  receiverIdentityPubkey,
}) => {
  try {
    const wallet = await getWallet(mnemonic);
    const invoice = await wallet.createSatsInvoice({
      amount: amountSats,
      memo,
      receiverIdentityPubkey,
    });
    console.log(invoice);
    return { didWork: true, invoice };
  } catch (err) {
    console.log("createSatsInvoice error", err);
    return { didWork: false, error: err.message };
  }
};

export const createTokensInvoice = async (
  mnemonic,
  tokenIdentifier = USDB_TOKEN_ID,
) => {
  try {
    const wallet = await getWallet(mnemonic);
    const invoice = await wallet.createTokensInvoice({
      tokenIdentifier,
    });

    console.log("Token Invoice:", invoice);
    return { didWork: true, invoice };
  } catch (err) {
    console.log("get spark transactions error", err);
    return { didWork: false, error: err.message };
  }
};

export const getCachedSparkTransactions = async (limit, identifyPubKey) => {
  try {
    const txResponse = await getAllSparkTransactions({ limit, identifyPubKey });

    if (!txResponse) throw new Error("Unable to get cached spark transactins");
    return txResponse;
  } catch (err) {
    console.log("get cached spark transaction error", err);
  }
};

export const useSparkPaymentType = (tx) => {
  try {
    const isLightningPayment = tx.type === "PREIMAGE_SWAP";
    const isBitcoinPayment =
      tx.type == "COOPERATIVE_EXIT" || tx.type === "UTXO_SWAP";
    const isSparkPayment = tx.type === "TRANSFER";

    return isLightningPayment
      ? "lightning"
      : isBitcoinPayment
        ? "bitcoin"
        : "spark";
  } catch (err) {
    console.log("Error finding which payment method was used", err);
  }
};

export const sparkPaymentType = (tx) => {
  try {
    const isLightningPayment = tx.type === "PREIMAGE_SWAP";
    const isBitcoinPayment =
      tx.type == "COOPERATIVE_EXIT" || tx.type === "UTXO_SWAP";
    const isSparkPayment = tx.type === "TRANSFER";

    return isLightningPayment
      ? "lightning"
      : isBitcoinPayment
        ? "bitcoin"
        : "spark";
  } catch (err) {
    console.log("Error finding which payment method was used", err);
  }
};

export const getSparkPaymentStatus = (status) => {
  return status === "TRANSFER_STATUS_COMPLETED" ||
    status === LightningSendRequestStatus.TRANSFER_COMPLETED ||
    status === SparkCoopExitRequestStatus.SUCCEEDED ||
    status === LightningReceiveRequestStatus.TRANSFER_COMPLETED ||
    status === LightningSendRequestStatus.PREIMAGE_PROVIDED ||
    status === SparkLeavesSwapRequestStatus.SUCCEEDED ||
    status === SparkUserRequestStatus.SUCCEEDED ||
    status === ClaimStaticDepositStatus.TRANSFER_COMPLETED ||
    status === ClaimStaticDepositStatus.SPEND_TX_BROADCAST ||
    status === LightningSendRequestStatus.LIGHTNING_PAYMENT_SUCCEEDED ||
    status == LightningReceiveRequestStatus.LIGHTNING_PAYMENT_RECEIVED
    ? "completed"
    : status === "TRANSFER_STATUS_RETURNED" ||
        status === "TRANSFER_STATUS_EXPIRED" ||
        status === "TRANSFER_STATUS_SENDER_INITIATED" ||
        status === LightningSendRequestStatus.USER_SWAP_RETURNED ||
        status === LightningSendRequestStatus.LIGHTNING_PAYMENT_FAILED ||
        status === LightningSendRequestStatus.TRANSFER_FAILED ||
        status === LightningSendRequestStatus.USER_TRANSFER_VALIDATION_FAILED ||
        status === LightningSendRequestStatus.PREIMAGE_PROVIDING_FAILED ||
        status === LightningSendRequestStatus.USER_SWAP_RETURN_FAILED ||
        status === SparkCoopExitRequestStatus.FAILED ||
        status === SparkCoopExitRequestStatus.EXPIRED ||
        status === LightningReceiveRequestStatus.TRANSFER_FAILED ||
        status ===
          LightningReceiveRequestStatus.PAYMENT_PREIMAGE_RECOVERING_FAILED ||
        status ===
          LightningReceiveRequestStatus.REFUND_SIGNING_COMMITMENTS_QUERYING_FAILED ||
        status === LightningReceiveRequestStatus.REFUND_SIGNING_FAILED ||
        status === LightningReceiveRequestStatus.TRANSFER_CREATION_FAILED ||
        status === SparkLeavesSwapRequestStatus.FAILED ||
        status === SparkLeavesSwapRequestStatus.EXPIRED ||
        status === SparkUserRequestStatus.FAILED ||
        status === SparkUserRequestStatus.CANCELED ||
        status === ClaimStaticDepositStatus.TRANSFER_CREATION_FAILED ||
        status === ClaimStaticDepositStatus.REFUND_SIGNING_FAILED ||
        status === ClaimStaticDepositStatus.UTXO_SWAPPING_FAILED ||
        status ===
          ClaimStaticDepositStatus.REFUND_SIGNING_COMMITMENTS_QUERYING_FAILED
      ? "failed"
      : "pending";
};

export const getSingleTxDetails = async (mnemonic, id) => {
  try {
    const wallet = await getWallet(mnemonic);
    return await wallet.getTransfer(id);
  } catch (err) {
    console.log("get single spark transaction error", err);
    return undefined;
  }
};

export const useIsSparkPaymentPending = (tx, transactionPaymentType) => {
  try {
    return (
      (transactionPaymentType === "bitcoin" &&
        tx.status === "TRANSFER_STATUS_SENDER_KEY_TWEAK_PENDING") ||
      (transactionPaymentType === "spark" && false) ||
      (transactionPaymentType === "lightning" &&
        tx.status === "LIGHTNING_PAYMENT_INITIATED")
    );
  } catch (err) {
    console.log("Error finding is payment method is pending", err);
    return "";
  }
};

export const useIsSparkPaymentFailed = (tx, transactionPaymentType) => {
  try {
    return (
      (transactionPaymentType === "bitcoin" &&
        tx.status === "TRANSFER_STATUS_RETURNED") ||
      (transactionPaymentType === "spark" &&
        tx.status === "TRANSFER_STATUS_RETURNED") ||
      (transactionPaymentType === "lightning" &&
        tx.status === "LIGHTNING_PAYMENT_INITIATED")
    );
  } catch (err) {
    console.log("Error finding is payment method is pending", err);
    return "";
  }
};

export const isSparkDonationPayment = (currentTx, currentTxDetails) => {
  try {
    return (
      currentTxDetails.direction === "OUTGOING" &&
      currentTx === "spark" &&
      currentTxDetails.address === import.meta.env.VITE_BLITZ_SPARK_ADDRESS &&
      currentTxDetails.receiverPubKey ===
        import.meta.env.VITE_BLITZ_SPARK_PUBKEY
    );
  } catch (err) {
    console.log("Error finding is payment method is pending", err);
    return false;
  }
};

export const findTransactionTxFromTxHistory = async (
  sparkTxId,
  previousOffset = 0,
  previousTxs = [],
  mnemonic,
) => {
  try {
    // Early return with cached transaction
    const cachedTx = previousTxs.find((tx) => tx.id === sparkTxId);
    if (cachedTx) {
      console.log("Using cache tx history");
      return {
        didWork: true,
        offset: previousOffset,
        foundTransfers: previousTxs,
        bitcoinTransfer: cachedTx,
      };
    }

    const wallet = await getWallet(mnemonic);
    let offset = previousOffset;
    let foundTransfers = [];
    let bitcoinTransfer = undefined;
    const maxAttempts = 20;

    while (offset < maxAttempts) {
      const transfers = await wallet.getTransfers(100, 100 * offset);
      foundTransfers = transfers.transfers;

      if (!foundTransfers.length) {
        break;
      }

      const includesTx = foundTransfers.find((tx) => tx.id === sparkTxId);
      if (includesTx) {
        bitcoinTransfer = includesTx;
        break;
      }

      if (transfers.offset === -1) {
        console.log("Reached end of transactions (offset: -1)");
        break;
      }

      offset += 1;
    }

    return { didWork: true, offset, foundTransfers, bitcoinTransfer };
  } catch (err) {
    console.log("Error finding bitcoin tx from history", err);
    return { didWork: false, error: err.message };
  }
};

/**
 * Validates WebView response and throws if error present
 */
export const validateWebViewResponse = (response, errorMessage) => {
  if (!response) {
    throw new Error(errorMessage || "No response from WebView");
  }

  if (response.error) {
    throw new Error(response.error);
  }

  if (
    Object.prototype.hasOwnProperty.call(response, "didWork") &&
    !response.didWork
  ) {
    throw new Error(response.error || errorMessage || "Operation failed");
  }

  return response;
};
