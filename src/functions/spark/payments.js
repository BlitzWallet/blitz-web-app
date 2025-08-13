import {
  getSparkAddress,
  getSparkBitcoinPaymentFeeEstimate,
  getSparkBitcoinPaymentRequest,
  getSparkLightningPaymentFeeEstimate,
  getSparkLightningSendRequest,
  getSparkStaticBitcoinL1Address,
  getSparkTransactions,
  receiveSparkLightningPayment,
  sendSparkBitcoinPayment,
  sendSparkLightningPayment,
  sendSparkPayment,
  sparkWallet,
} from ".";

import {
  SATSPERBITCOIN,
  SPARK_TO_LN_FEE,
  SPARK_TO_SPARK_FEE,
} from "../../constants/math";
import {
  isSendingPayingEventEmiiter,
  SENDING_PAYMENT_EVENT_NAME,
} from "../../contexts/sparkContext";
import calculateProgressiveBracketFee from "./calculateSupportFee";
import { formatBip21SparkAddress } from "./handleBip21SparkAddress";
import {
  addSingleUnpaidSparkLightningTransaction,
  bulkUpdateSparkTransactions,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "./transactions";

export const sparkPaymenWrapper = async ({
  getFee = false,
  address,
  paymentType,
  amountSats = 0,
  exitSpeed = "FAST",
  masterInfoObject,
  fee,
  memo,
  userBalance = 0,
  sparkInformation,
  feeQuote,
  usingZeroAmountInvoice = false,
}) => {
  try {
    console.log("Begining spark payment");
    if (!sparkWallet) throw new Error("sparkWallet not initialized");
    const supportFee = await calculateProgressiveBracketFee(amountSats);
    console.log(supportFee);
    if (getFee) {
      console.log("Calculating spark payment fee");
      let calculatedFee = 0;
      let tempFeeQuote;
      if (paymentType === "lightning") {
        const routingFee = await getSparkLightningPaymentFeeEstimate(
          address,
          amountSats
        );
        if (!routingFee.didWork)
          throw new Error(routingFee.error || "Unable to get routing fee");
        calculatedFee = routingFee.response;
      } else if (paymentType === "bitcoin") {
        const feeResponse = await getSparkBitcoinPaymentFeeEstimate({
          amountSats,
          withdrawalAddress: address,
        });
        if (!feeResponse.didWork)
          throw new Error(
            feeResponse.error || "Unable to get Bitcoin fee estimation"
          );
        const data = feeResponse.response;
        calculatedFee =
          data.userFeeFast.originalValue +
          data.l1BroadcastFeeFast.originalValue;
        tempFeeQuote = data;
      } else {
        // Spark payments
        const feeResponse = await sparkWallet.getSwapFeeEstimate(amountSats);
        calculatedFee =
          feeResponse.feeEstimate.originalValue || SPARK_TO_SPARK_FEE;
      }
      return {
        didWork: true,
        fee: Math.round(calculatedFee),
        supportFee: Math.round(supportFee),
        feeQuote: tempFeeQuote,
      };
    }
    let response;
    if (
      userBalance <
      amountSats + (paymentType === "bitcoin" ? supportFee : fee)
    )
      throw new Error("Insufficient funds");
    isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, true);
    let supportFeeResponse;

    if (paymentType === "lightning") {
      const initialFee = Math.round(fee - supportFee);
      const lightningPayResponse = await sendSparkLightningPayment({
        maxFeeSats: Math.ceil(initialFee * 1.2), //addding 20% buffer so we dont undershoot it
        invoice: address,
        amountSats: usingZeroAmountInvoice ? amountSats : undefined,
      });
      if (!lightningPayResponse.didWork)
        throw new Error(
          lightningPayResponse.error || "Error when sending lightning payment"
        );
      handleSupportPayment(masterInfoObject, supportFee);

      const data = lightningPayResponse.paymentResponse;
      const tx = {
        id: data.id,
        paymentStatus: "pending",
        paymentType: "lightning",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: fee,
          amount: amountSats,
          address: data.encodedInvoice,
          time: new Date(data.updatedAt).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          preimage: "",
        },
      };
      response = tx;

      await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", supportFee);
    } else if (paymentType === "bitcoin") {
      // make sure to import exist speed
      const onChainPayResponse = await sendSparkBitcoinPayment({
        onchainAddress: address,
        exitSpeed,
        amountSats,
        feeQuote,
        deductFeeFromWithdrawalAmount: true,
      });

      if (!onChainPayResponse.didWork)
        throw new Error(
          onChainPayResponse.error || "Error when sending bitcoin payment"
        );
      handleSupportPayment(masterInfoObject, supportFee);

      console.log(onChainPayResponse, "on-chain pay response");
      const data = onChainPayResponse.response;

      const tx = {
        id: data.id,
        paymentStatus: "pending",
        paymentType: "bitcoin",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: fee,
          amount: amountSats,
          address: address,
          time: new Date(data.updatedAt).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          onChainTxid: data.coopExitTxid,
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", supportFee);
    } else {
      const sparkPayResponse = await sendSparkPayment({
        receiverSparkAddress: address,
        amountSats,
      });

      if (!sparkPayResponse.didWork)
        throw new Error(
          sparkPayResponse.error || "Error when sending spark payment"
        );
      handleSupportPayment(masterInfoObject, supportFee);
      const data = sparkPayResponse.response;
      const tx = {
        id: data.id,
        paymentStatus: "completed",
        paymentType: "spark",
        accountId: data.senderIdentityPublicKey,
        details: {
          fee: fee,
          amount: amountSats,
          address: address,
          time: new Date(data.updatedTime).getTime(),
          direction: "OUTGOING",
          description: memo || "",
          senderIdentityPublicKey: data.receiverIdentityPublicKey,
        },
      };
      response = tx;
      await bulkUpdateSparkTransactions([tx], "paymentWrapperTx", supportFee);
    }
    console.log(response, "resonse in send function");
    return { didWork: true, response };
  } catch (err) {
    console.log("Send lightning payment error", err);
    return { didWork: false, error: err.message };
  } finally {
    if (!getFee) {
      isSendingPayingEventEmiiter.emit(SENDING_PAYMENT_EVENT_NAME, false);
    }
  }
};

export const sparkReceivePaymentWrapper = async ({
  amountSats,
  memo,
  paymentType,
  shouldNavigate,
}) => {
  try {
    if (!sparkWallet) throw new Error("sparkWallet not initialized");

    if (paymentType === "lightning") {
      const invoiceResponse = await receiveSparkLightningPayment({
        amountSats,
        memo,
      });

      if (!invoiceResponse.didWork) throw new Error(invoiceResponse.error);
      const invoice = invoiceResponse.response;

      const tempTransaction = {
        id: invoice.id,
        amount: amountSats,
        expiration: invoice.invoice.expiresAt,
        description: memo || "",
        shouldNavigate,
        details: {
          createdTime: new Date(invoice.createdAt).getTime(),
          isLNURL: false,
          shouldNavigate: true,
          isBlitzContactPayment: false,
        },
      };
      await addSingleUnpaidSparkLightningTransaction(tempTransaction);
      return {
        didWork: true,
        data: invoice,
        invoice: invoice.invoice.encodedInvoice,
      };
    } else if (paymentType === "bitcoin") {
      // Handle storage of tx when claiming in spark context
      const depositAddress = await getSparkStaticBitcoinL1Address();

      let formmattedAddress = amountSats
        ? `bitcoin:${depositAddress}?amount:${Number(
            amountSats / SATSPERBITCOIN
          ).toFixed(8)}${
            memo
              ? `&label=${encodeURIComponent(memo)}&message${encodeURIComponent(
                  memo
                )}`
              : ""
          }`
        : depositAddress;

      return {
        didWork: true,
        invoice: formmattedAddress,
      };
    } else {
      // No need to save address since it is constant
      const sparkAddress = await getSparkAddress();
      if (!sparkAddress.didWork) throw new Error(sparkAddress.error);

      const data = sparkAddress.response;

      return {
        didWork: true,
        invoice: data,
      };
    }
  } catch (err) {
    console.log("Receive spark payment error", err);
    return { didWork: false, error: err.message };
  }
};

async function handleSupportPayment(masterInfoObject, supportFee) {
  try {
    if (masterInfoObject?.enabledDeveloperSupport?.isEnabled) {
      await new Promise((res) => setTimeout(res, 2000));
      await sendSparkPayment({
        receiverSparkAddress: import.meta.env.VITE_BLITZ_SPARK_ADDRESS,
        amountSats: supportFee,
      });

      sparkTransactionsEventEmitter.emit(
        SPARK_TX_UPDATE_ENVENT_NAME,
        "supportTx"
      );
    }
  } catch (err) {
    console.log("Error sending support payment", err);
  }
}
