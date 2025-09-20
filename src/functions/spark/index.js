import { SparkWallet } from "@buildonspark/spark-sdk";
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

export let sparkWallet = {};

export const initializeSparkWallet = async (mnemonic) => {
  try {
    if (sparkWallet[sha256Hash(mnemonic)]) return { isConnected: true };

    const { wallet } = await SparkWallet.initialize({
      mnemonicOrSeed: mnemonic,
      options: { network: "MAINNET" },
    });

    console.log(sha256Hash(mnemonic), wallet, mnemonic);
    sparkWallet[sha256Hash(mnemonic)] = wallet;

    console.log(sparkWallet);

    return { isConnected: true };
  } catch (err) {
    console.log("Initialize spark wallet error", err);
    return { isConnected: false, error: err.message };
  }
};

export const getSparkIdentityPubKey = async (mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getIdentityPublicKey();
  } catch (err) {
    console.log("Get spark balance error", err);
  }
};

export const getSparkBalance = async (mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const balance = await sparkWallet[sha256Hash(mnemonic)].getBalance();
    console.log("Spark Balance:", balance);
    console.log("Tokens balance size:", balance.tokenBalances.size);
    console.log(
      "Tokens balance keys",
      Array.from(balance.tokenBalances.keys())
    );
    console.log(
      "Tokens balance values",
      Array.from(balance.tokenBalances.values())
    );

    const cachedTokens = await migrateCachedTokens(mnemonic);

    let currentTokensObj = {};
    for (const [tokensIdentifier, tokensData] of balance.tokenBalances) {
      currentTokensObj[tokensIdentifier] = tokensData;
      console.log("Tokens Identifier", tokensIdentifier);
      console.log("Tokens Balance:", tokensData);
    }

    console.log("tokens in cache", cachedTokens);
    console.log("current tokens object", currentTokensObj);

    const allTokens = mergeTokensWithCache(
      balance.tokenBalances,
      cachedTokens,
      mnemonic
    );

    console.log("all tokens after merge", allTokens);

    await saveCachedTokens(allTokens);

    return {
      tokensObj: allTokens[sha256Hash(mnemonic)],
      balance: balance.balance,
      didWork: true,
    };
  } catch (err) {
    console.log("Get spark balance error", err);
    return { didWork: false };
  }
};

// export const getSparkBitcoinL1Address = async () => {
//   try {
//     if (!sparkWallet) throw new Error("sparkWallet not initialized");
//     return await sparkWallet.getSingleUseDepositAddress();
//   } catch (err) {
//     console.log("Get Bitcoin mainchain address error", err);
//   }
// };

export const getSparkStaticBitcoinL1Address = async (mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getStaticDepositAddress();
  } catch (err) {
    console.log("Get reusable Bitcoin mainchain address error", err);
  }
};

export const queryAllStaticDepositAddresses = async (mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[
      sha256Hash(mnemonic)
    ].queryStaticDepositAddresses();
  } catch (err) {
    console.log("refund reusable Bitcoin mainchain address error", err);
  }
};

export const getSparkStaticBitcoinL1AddressQuote = async (txid, mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return {
      didwork: true,
      quote: await sparkWallet[sha256Hash(mnemonic)].getClaimStaticDepositQuote(
        txid
      ),
    };
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].refundStaticDeposit({
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[sha256Hash(mnemonic)].claimStaticDeposit(
      {
        creditAmountSats,
        sspSignature,
        transactionId,
      }
    );
    return { didWork: true, response };
  } catch (err) {
    console.log("claim static deposit address error", err);
    return { didWork: false, error: err.message };
  }
};

// export const getUnusedSparkBitcoinL1Address = async () => {
//   try {
//     if (!sparkWallet) throw new Error("sparkWallet not initialized");
//     return (await sparkWallet.getUnusedDepositAddresses()) || [];
//   } catch (err) {
//     console.log("Get Bitcoin mainchain address error", err);
//   }
// };

// export const querySparkBitcoinL1Transaction = async (depositAddress) => {
//   try {
//     if (!sparkWallet) throw new Error("sparkWallet not initialized");
//     return await getLatestDepositTxId(depositAddress);
//   } catch (err) {
//     console.log("Get latest deposit address information error", err);
//   }
// };

// export const claimSparkBitcoinL1Transaction = async (depositAddress) => {
//   try {
//     if (!sparkWallet) throw new Error("sparkWallet not initialized");
//     const txId = await querySparkBitcoinL1Transaction(depositAddress);
//     const claimResponse = await (txId
//       ? sparkWallet.claimDeposit(txId)
//       : Promise.resolve(null));
//     return [txId, claimResponse];
//   } catch (err) {
//     console.log("Claim bitcoin mainnet payment error", err);
//   }
// };

export const getSparkAddress = async (mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[sha256Hash(mnemonic)].getSparkAddress();
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[sha256Hash(mnemonic)].transfer({
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[sha256Hash(mnemonic)].transferTokens({
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
  mnemonic
) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[
      sha256Hash(mnemonic)
    ].getLightningSendFeeEstimate({
      encodedInvoice: invoice.toLowerCase(),
      amountSats: amountSat,
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Get lightning payment fee error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkBitcoinPaymentRequest = async (paymentId, mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getCoopExitRequest(
      paymentId
    );
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[
      sha256Hash(mnemonic)
    ].getWithdrawalFeeQuote({
      amountSats,
      withdrawalAddress: withdrawalAddress.toLowerCase(),
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Get bitcoin payment fee estimate error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkPaymentFeeEstimate = async (amountSats, mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const feeResponse = await sparkWallet[
      sha256Hash(mnemonic)
    ].getSwapFeeEstimate(amountSats);
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
}) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[
      sha256Hash(mnemonic)
    ].createLightningInvoice({
      amountSats,
      memo,
      expirySeconds: 60 * 60 * 12, // 12 hour invoice expiry
    });
    return { didWork: true, response };
  } catch (err) {
    console.log("Receive lightning payment error", err);
    return { didWork: false, error: err.message };
  }
};

export const getSparkLightningSendRequest = async (id, mnemonic) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getLightningSendRequest(id);
  } catch (err) {
    console.log("Get spark lightning send request error", err);
  }
};

export const getSparkLightningPaymentStatus = async ({
  lightningInvoiceId,
  mnemonic,
}) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getLightningReceiveRequest(
      lightningInvoiceId
    );
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const paymentResponse = await sparkWallet[
      sha256Hash(mnemonic)
    ].payLightningInvoice({
      invoice: invoice.toLowerCase(),
      maxFeeSats: maxFeeSats,
      amountSatsToSend: amountSats,
    });
    return { didWork: true, paymentResponse };
  } catch (err) {
    console.log("Send lightning payment error", err);
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
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    const response = await sparkWallet[sha256Hash(mnemonic)].withdraw({
      onchainAddress: onchainAddress.toLowerCase(),
      exitSpeed,
      amountSats,
      feeQuote,
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
  mnemonic
) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].getTransfers(
      transferCount,
      offsetIndex
    );
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
}) => {
  try {
    if (!sparkWallet[sha256Hash(mnemonic)])
      throw new Error("sparkWallet not initialized");
    return await sparkWallet[sha256Hash(mnemonic)].queryTokenTransactions({
      ownerPublicKeys,
      issuerPublicKeys,
      tokenTransactionHashes,
      tokenIdentifiers,
      outputIds,
    });
  } catch (err) {
    console.log("get spark transactions error", err);
    return [];
  }
};

export const getCachedSparkTransactions = async (limit, identifyPubKey) => {
  try {
    const txResponse = await getAllSparkTransactions(limit, identifyPubKey);
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
    status === SparkLeavesSwapRequestStatus.SUCCEEDED ||
    status === SparkUserRequestStatus.SUCCEEDED ||
    status === ClaimStaticDepositStatus.TRANSFER_COMPLETED
    ? "completed"
    : status === "TRANSFER_STATUS_RETURNED" ||
      status === "TRANSFER_STATUS_EXPIRED" ||
      status === "TRANSFER_STATUS_SENDER_INITIATED" ||
      status === LightningSendRequestStatus.LIGHTNING_PAYMENT_FAILED ||
      status === SparkCoopExitRequestStatus.FAILED ||
      status === SparkCoopExitRequestStatus.EXPIRED ||
      status === LightningReceiveRequestStatus.TRANSFER_FAILED ||
      status ===
        LightningReceiveRequestStatus.PAYMENT_PREIMAGE_RECOVERING_FAILED ||
      status ===
        LightningReceiveRequestStatus.REFUND_SIGNING_COMMITMENTS_QUERYING_FAILED ||
      status === LightningReceiveRequestStatus.REFUND_SIGNING_FAILED ||
      status === SparkLeavesSwapRequestStatus.FAILED ||
      status === SparkLeavesSwapRequestStatus.EXPIRED ||
      status === SparkUserRequestStatus.FAILED ||
      status === ClaimStaticDepositStatus.TRANSFER_CREATION_FAILED ||
      status === ClaimStaticDepositStatus.REFUND_SIGNING_FAILED ||
      status === ClaimStaticDepositStatus.UTXO_SWAPPING_FAILED ||
      status === LightningReceiveRequestStatus.FUTURE_VALUE
    ? "failed"
    : "pending";
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
  mnemonic
) => {
  try {
    // First check cached transactions
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

    let offset = previousOffset;
    let foundTransfers = [];
    let bitcoinTransfer = undefined;
    const maxAttempts = 20;
    while (offset < maxAttempts) {
      const transfers = await getSparkTransactions(100, 100 * offset, mnemonic);
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
